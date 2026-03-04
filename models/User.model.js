const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    first_name: {
        type: String,
        required: [true, 'El nombre es requerido'],
        trim: true,
        minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
        maxlength: [50, 'El nombre no puede exceder 50 caracteres']
    },
    last_name: {
        type: String,
        required: [true, 'El apellido es requerido'],
        trim: true,
        minlength: [2, 'El apellido debe tener al menos 2 caracteres'],
        maxlength: [50, 'El apellido no puede exceder 50 caracteres']
    },
    email: {
        type: String,
        required: [true, 'El email es requerido'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Por favor ingresa un email válido']
    },
    age: {
        type: Number,
        required: [true, 'La edad es requerida'],
        min: [18, 'Debes ser mayor de 18 años'],
        max: [120, 'Edad inválida']
    },
    password: {
        type: String,
        required: [true, 'La contraseña es requerida'],
        minlength: [6, 'La contraseña debe tener al menos 6 caracteres']
    },
    cart: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cart'
    },
    pets: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pet'
    }],
    role: {
        type: String,
        enum: ['user', 'admin', 'premium'],
        default: 'user'
    },
    lastLogin: {
        type: Date,
        default: null
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date,
        default: null
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    loginHistory: [{
        timestamp: {
            type: Date,
            default: Date.now
        },
        ip: String,
        userAgent: String,
        success: Boolean
    }],
    passwordChangedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    versionKey: false
});

userSchema.index({ email: 1 });
userSchema.index({ lockUntil: 1 });

userSchema.virtual('fullName').get(function() {
    return `${this.first_name} ${this.last_name}`;
});

userSchema.virtual('isAccountLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.methods.recordLoginAttempt = async function(success, ip, userAgent) {
    this.loginHistory.unshift({
        timestamp: new Date(),
        ip,
        userAgent,
        success
    });
    
    if (this.loginHistory.length > 10) {
        this.loginHistory = this.loginHistory.slice(0, 10);
    }

    if (success) {
        this.loginAttempts = 0;
        this.lockUntil = null;
        this.isLocked = false;
        this.lastLogin = new Date();
    } else {
        this.loginAttempts += 1;
        if (this.loginAttempts >= 5) {
            this.lockUntil = new Date(Date.now() + 30 * 60 * 1000); 
            this.isLocked = true;
        }
    }

    return await this.save();
};

userSchema.methods.unlockAccount = async function() {
    this.loginAttempts = 0;
    this.lockUntil = null;
    this.isLocked = false;
    return await this.save();
};

userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    delete user.loginAttempts;
    delete user.lockUntil;
    return user;
};

userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

const User = mongoose.model('User', userSchema);

module.exports = User;