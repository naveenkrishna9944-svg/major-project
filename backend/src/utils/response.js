/**
 * Same response envelope as the original PHP API:
 *   success -> { status: true,  message, data }
 *   error   -> { status: false, message }
 */
class ApiError extends Error {
  constructor(message, code = 400) {
    super(message);
    this.code = code;
  }
}

const sendSuccess = (res, message, data = []) => res.json({ status: true, message, data });

// Throw from anywhere inside a route handler; the error middleware turns it into JSON.
const fail = (message, code = 400) => {
  throw new ApiError(message, code);
};

module.exports = { ApiError, sendSuccess, fail };
