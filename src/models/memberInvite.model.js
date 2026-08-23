const mongoose = require('mongoose');
const {toJSON} = require('./plugins');

const memberInviteSchema = mongoose.Schema(
  {
    email: {type: String, required: true, trim: true, lowercase: true},
    role: {type: String, required: true, enum: ['user', 'publisher', 'admin']},
    workspaceKey: {type: String, required: true, trim: true, lowercase: true, index: true},
    token: {type: String, required: true, unique: true, index: true},
    invitedBy: {type: String, required: true},
    expiresAt: {type: Date, required: true},
    status: {type: String, enum: ['pending', 'accepted', 'revoked'], default: 'pending'},
  },
  {timestamps: true}
);

memberInviteSchema.plugin(toJSON);

const MemberInvite = mongoose.models.MemberInvite || mongoose.model('MemberInvite', memberInviteSchema);

module.exports = MemberInvite;
