jest.mock('../../../src/models/generateUsage.model', () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

const GenerateUsage = require('../../../src/models/generateUsage.model');
const { consumeGenerateQuota, dailyLimit } = require('../../../src/services/generateQuota.service');

describe('generate quota', () => {
  const original = process.env.GENERATE_DAILY_LIMIT;

  afterEach(() => {
    process.env.GENERATE_DAILY_LIMIT = original;
    jest.clearAllMocks();
  });

  test('default cap is 20', () => {
    delete process.env.GENERATE_DAILY_LIMIT;
    expect(dailyLimit()).toBe(20);
  });

  test('0 means unlimited', async () => {
    process.env.GENERATE_DAILY_LIMIT = '0';
    await expect(consumeGenerateQuota('acme@example.com')).resolves.toEqual({ remaining: Infinity, limit: 0 });
    expect(GenerateUsage.findOne).not.toHaveBeenCalled();
  });

  test('blocks a workspace that already hit the cap', async () => {
    process.env.GENERATE_DAILY_LIMIT = '2';
    GenerateUsage.findOne.mockResolvedValue({ count: 2 });
    await expect(consumeGenerateQuota('acme@example.com')).rejects.toMatchObject({
      statusCode: 429,
    });
  });
});
