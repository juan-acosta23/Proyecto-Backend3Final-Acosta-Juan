const mongoose = require('mongoose');
const crypto = require('crypto');

const passwordResetSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    token: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },
    used: {
        type: Boolean,
        default: false
    },
    usedAt: {
        type: Date,
        default: null
    },
    ipAddress: {
        type: String,
        default: null
    }
}, {
    timestamps: true,
    versionKey: false
});

passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });

passwordResetSchema.statics.createResetToken = async function(userId, ipAddress = null) {
    try {

        await this.updateMany(
            { user: userId, used: false },
            { used: true, usedAt: new Date() }
        );

        const token = crypto.randomBytes(32).toString('hex');

        const resetToken = new this({
            user: userId,
            token,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000), 
            ipAddress
        });

        await resetToken.save();
        return resetToken;
    } catch (error) {
        throw new Error(`Error al crear token de reseteo: ${error.message}`);
    }
};

passwordResetSchema.methods.isValid = function() {
    return !this.used && this.expiresAt > new Date();
};

passwordResetSchema.methods.markAsUsed = async function() {
    this.used = true;
    this.usedAt = new Date();
    return await this.save();
};

passwordResetSchema.statics.cleanExpired = async function() {
    try {
        return await this.deleteMany({
            expiresAt: { $lt: new Date() }
        });
    } catch (error) {
        throw new Error(`Error al limpiar tokens expirados: ${error.message}`);
    }
};

passwordResetSchema.statics.findValidToken = async function(token) {
    try {
        const resetToken = await this.findOne({ token }).populate('user');
        
        if (!resetToken) {
            return null;
        }

        if (!resetToken.isValid()) {
            return null;
        }

        return resetToken;
    } catch (error) {
        throw new Error(`Error al buscar token: ${error.message}`);
    }
};

const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);

module.exports = PasswordReset;