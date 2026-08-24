const users = [];
const invites = [];

const matches = (doc, query = {}) =>
  Object.entries(query).every(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value) && value.$gt) {
      return doc[key] > value.$gt;
    }
    return doc[key] === value;
  });

jest.mock('../../../src/services/email.service', () => ({
  sendInviteEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../../src/models', () => ({
  User: {
    findOne: jest.fn(async (query) => users.find((doc) => matches(doc, query)) || null),
    countDocuments: jest.fn(
      async (query) => users.filter((doc) => matches(doc, query)).length
    ),
    create: jest.fn(async (body) => {
      const doc = {
        ...body,
        save: jest.fn(async function save() {
          return this;
        }),
      };
      users.push(doc);
      return doc;
    }),
    isEmailTaken: jest.fn(async (email) => users.some((doc) => doc.email === email)),
  },
  MemberInvite: {
    findOne: jest.fn(async (query) => invites.find((doc) => matches(doc, query)) || null),
    create: jest.fn(async (body) => {
      const doc = {
        ...body,
        save: jest.fn(async function save() {
          return this;
        }),
      };
      invites.push(doc);
      return doc;
    }),
  },
}));

const {User} = require('../../../src/models');
const emailService = require('../../../src/services/email.service');
const userService = require('../../../src/services/user.service');
const memberInviteService = require('../../../src/services/memberInvite.service');

const actor = {email: 'ankur@sling.biz', workspaceKey: 'ws-ankur'};

const addUser = (overrides = {}) => {
  const doc = {
    email: 'bob@sling.biz',
    workspaceKey: 'other-ws',
    role: 'user',
    save: jest.fn(async function save() {
      return this;
    }),
    ...overrides,
  };
  users.push(doc);
  return doc;
};

const addInvite = (overrides = {}) => {
  const doc = {
    email: 'new@sling.biz',
    role: 'user',
    workspaceKey: actor.workspaceKey,
    token: 'token-new',
    invitedBy: actor.email,
    expiresAt: new Date(Date.now() + 86400000),
    status: 'pending',
    save: jest.fn(async function save() {
      return this;
    }),
    ...overrides,
  };
  invites.push(doc);
  return doc;
};

beforeEach(() => {
  users.splice(0, users.length);
  invites.splice(0, invites.length);
  jest.clearAllMocks();
  emailService.sendInviteEmail.mockResolvedValue(true);
});

describe('invite existing Sling accounts', () => {
  test('createInvite allows an existing user in another workspace', async () => {
    addUser({email: 'bob@sling.biz', workspaceKey: 'other-ws', role: 'user'});
    const result = await memberInviteService.createInvite(
      {email: 'bob@sling.biz', role: 'publisher'},
      actor
    );
    expect(result.alreadyPending).toBe(false);
    expect(result.invite.email).toBe('bob@sling.biz');
    expect(result.invite.role).toBe('publisher');
    expect(emailService.sendInviteEmail).toHaveBeenCalled();
  });

  test('createInvite rejects someone already in this workspace', async () => {
    addUser({email: 'bob@sling.biz', workspaceKey: actor.workspaceKey, role: 'user'});
    await expect(
      memberInviteService.createInvite({email: 'bob@sling.biz', role: 'user'}, actor)
    ).rejects.toMatchObject({message: 'That person is already in this workspace'});
    expect(emailService.sendInviteEmail).not.toHaveBeenCalled();
  });

  test('createInvite rejects the last owner of another workspace', async () => {
    addUser({email: 'owner@sling.biz', workspaceKey: 'solo-ws', role: 'owner'});
    await expect(
      memberInviteService.createInvite({email: 'owner@sling.biz', role: 'user'}, actor)
    ).rejects.toMatchObject({
      message: 'The last owner cannot be moved to another workspace',
    });
  });

  test('createInvite allows an owner when another owner remains', async () => {
    addUser({email: 'owner@sling.biz', workspaceKey: 'team-ws', role: 'owner'});
    addUser({email: 'co@sling.biz', workspaceKey: 'team-ws', role: 'owner'});
    const result = await memberInviteService.createInvite(
      {email: 'owner@sling.biz', role: 'admin'},
      actor
    );
    expect(result.invite.email).toBe('owner@sling.biz');
  });

  test('acceptInvite moves an existing user and does not create a second account', async () => {
    const bob = addUser({
      email: 'bob@sling.biz',
      workspaceKey: 'other-ws',
      role: 'admin',
    });
    addInvite({email: 'bob@sling.biz', token: 'token-bob', role: 'publisher'});
    const createSpy = jest.spyOn(userService, 'createUser');
    const user = await memberInviteService.acceptInvite('token-bob', {});
    expect(createSpy).not.toHaveBeenCalled();
    expect(user).toBe(bob);
    expect(bob.workspaceKey).toBe(actor.workspaceKey);
    expect(bob.role).toBe('publisher');
    expect(bob.save).toHaveBeenCalled();
    expect(invites[0].status).toBe('accepted');
    createSpy.mockRestore();
  });

  test('acceptInvite rejects the last owner of the old workspace', async () => {
    addUser({email: 'owner@sling.biz', workspaceKey: 'solo-ws', role: 'owner'});
    addInvite({email: 'owner@sling.biz', token: 'token-owner', role: 'user'});
    await expect(memberInviteService.acceptInvite('token-owner', {})).rejects.toMatchObject({
      message: 'The last owner cannot be moved to another workspace',
    });
  });

  test('acceptInvite still creates a new user with name and password', async () => {
    addInvite({email: 'new@sling.biz', token: 'token-new', role: 'user'});
    const user = await memberInviteService.acceptInvite('token-new', {
      name: 'New Person',
      password: 'secretpass1',
    });
    expect(user.email).toBe('new@sling.biz');
    expect(user.workspaceKey).toBe(actor.workspaceKey);
    expect(user.role).toBe('user');
    expect(User.create).toHaveBeenCalled();
    expect(invites[0].status).toBe('accepted');
  });

  test('presentInvite flags existing accounts so Studio can skip the password form', async () => {
    addUser({email: 'bob@sling.biz'});
    addInvite({email: 'bob@sling.biz', token: 'token-bob'});
    await expect(memberInviteService.presentInvite('token-bob')).resolves.toMatchObject({
      email: 'bob@sling.biz',
      existingAccount: true,
    });
    addInvite({email: 'new@sling.biz', token: 'token-new'});
    await expect(memberInviteService.presentInvite('token-new')).resolves.toMatchObject({
      email: 'new@sling.biz',
      existingAccount: false,
    });
  });
});
