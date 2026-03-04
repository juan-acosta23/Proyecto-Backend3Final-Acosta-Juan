const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    code: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    purchase_datetime: {
        type: Date,
        default: Date.now,
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: [0, 'El monto debe ser mayor o igual a 0']
    },
    purchaser: {
        type: String,
        required: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
    },
    products: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, 'La cantidad debe ser mayor a 0']
        },
        price: {
            type: Number,
            required: true,
            min: [0, 'El precio debe ser mayor o igual a 0']
        },
        subtotal: {
            type: Number,
            required: true,
            min: [0, 'El subtotal debe ser mayor o igual a 0']
        }
    }],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'partial', 'cancelled'],
        default: 'pending'
    }
}, {
    timestamps: true,
    versionKey: false
});

ticketSchema.index({ user: 1, purchase_datetime: -1 });
ticketSchema.index({ purchaser: 1, purchase_datetime: -1 });

ticketSchema.statics.generateUniqueCode = async function() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    let exists = true;

    while (exists) {
        code = '';
        for (let i = 0; i < 10; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        
        const ticket = await this.findOne({ code });
        exists = !!ticket;
    }

    return code;
};

ticketSchema.pre('save', function(next) {
    if (this.products && this.products.length > 0) {
        this.amount = this.products.reduce((total, item) => {
            return total + item.subtotal;
        }, 0);
    }
    next();
});

ticketSchema.virtual('amountFormatted').get(function() {
    return `$${this.amount.toFixed(2)}`;
});

ticketSchema.methods.getSummary = function() {
    return {
        code: this.code,
        date: this.purchase_datetime,
        amount: this.amount,
        purchaser: this.purchaser,
        status: this.status,
        itemsCount: this.products.length
    };
};

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;