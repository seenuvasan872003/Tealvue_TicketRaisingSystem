const OTPBlock = require('../models/OTPBlock');

const checkOTPBlock = async (req, res, next) => {
  try {
    const email = req.body.email?.toLowerCase().trim();

    if (!email) return next();

    const block = await OTPBlock.findOne({ email });

    if (!block) return next();

    const now = new Date();
    
    // Check if the block is actually expired (Mongoose TTL indexes run every 60s, so double check here)
    if (block.blockExpiresAt <= now) {
      await OTPBlock.deleteOne({ _id: block._id });
      return next();
    }

    const remaining = Math.ceil((block.blockExpiresAt - now) / 60000);

    return res.status(429).json({
      success: false,
      code: 'OTP_BLOCKED',
      message: `Too many incorrect attempts. Try again in ${remaining} minute${remaining > 1 ? 's' : ''}.`,
      blockedUntil: block.blockExpiresAt,
      remainingMinutes: remaining
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { checkOTPBlock };
