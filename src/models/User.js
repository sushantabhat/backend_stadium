const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function(v) {
          if (!/^\S+@\S+\.\S+$/.test(v)) return false;
          
          // Generic typo detection using Levenshtein distance for common domains
          const domain = v.split('@')[1];
          const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
          
          // Simple Levenshtein distance implementation
          const getEditDistance = (a, b) => {
            if (a.length === 0) return b.length;
            if (b.length === 0) return a.length;
            const matrix = Array(b.length + 1).fill().map(() => Array(a.length + 1).fill(0));
            for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
            for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
            for (let j = 1; j <= b.length; j++) {
              for (let i = 1; i <= a.length; i++) {
                const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                  matrix[j][i - 1] + 1,
                  matrix[j - 1][i] + 1,
                  matrix[j - 1][i - 1] + indicator
                );
              }
            }
            return matrix[b.length][a.length];
          };

          for (const common of commonDomains) {
            const dist = getEditDistance(domain, common);
            // If it's a slight typo (distance 1 or 2) but not the exact domain, reject it
            // We allow distance 0 (exact match) and distance > 2 (completely different domain)
            if (dist > 0 && dist <= 2) {
              return false;
            }
          }
          return true;
        },
        message: 'Please provide a valid email without typos (e.g. @gmail.com)',
      },
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'staff', 'supervisor', 'admin'],
      default: 'user',
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    status: this.status,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
