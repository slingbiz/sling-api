const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const memberValidation = require('../../validations/member.validation');
const memberController = require('../../controllers/member.controller');

const router = express.Router();

router.get('/', auth('getUsers'), memberController.listMembers);
router.post('/invite', auth('manageUsers'), validate(memberValidation.invite), memberController.inviteMember);
router.get('/invites/:token', validate(memberValidation.getInvite), memberController.getInvite);
router.post('/invites/:token/accept', validate(memberValidation.accept), memberController.acceptInvite);
router.delete('/invites/:inviteId', auth('manageUsers'), validate(memberValidation.revoke), memberController.revokeInvite);
router.patch('/:userId/role', auth('manageUsers'), validate(memberValidation.changeRole), memberController.changeRole);
router.delete('/:userId', auth('manageUsers'), validate(memberValidation.removeMember), memberController.removeMember);

module.exports = router;
