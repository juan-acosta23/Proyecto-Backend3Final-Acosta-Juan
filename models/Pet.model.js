const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'El nombre de la mascota es requerido'],
        trim: true
    },
    species: {
        type: String,
        required: [true, 'La especie es requerida'],
        enum: ['dog', 'cat', 'bird', 'hamster', 'rabbit', 'fish', 'turtle'],
        lowercase: true
    },
    birthDate: {
        type: Date,
        default: Date.now
    },
    adopted: {
        type: Boolean,
        default: false
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    image: {
        type: String,
        default: null
    }
}, {
    timestamps: true,
    versionKey: false
});

petSchema.virtual('age').get(function() {
    if (!this.birthDate) return null;
    const today = new Date();
    const birth = new Date(this.birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
});

petSchema.methods.adopt = async function(userId) {
    if (this.adopted) {
        throw new Error('Esta mascota ya ha sido adoptada');
    }
    this.adopted = true;
    this.owner = userId;
    return await this.save();
};

petSchema.statics.findAvailable = function() {
    return this.find({ adopted: false });
};

petSchema.statics.findBySpecies = function(species) {
    return this.find({ species: species.toLowerCase() });
};

const Pet = mongoose.model('Pet', petSchema);

module.exports = Pet;