import * as crypto from 'crypto';

export const _hash = (x) => crypto.createHash('sha512').update(x).digest('hex').toLowerCase()

export const LOG_STATUSES = {
    SEND_CODE: 'SEND_CODE',
    RESEND_CODE: 'RESEND_CODE',
    INVALID: 'INVALID',
    VALID: 'VALID',
    EXPIRED: 'EXPIRED',
};

export const sortNumber = (a, b) => {
    return a - b;
};

export const _getLatestIndex = (indexes) => {
    indexes.sort(sortNumber);
    return indexes[indexes.length - 1];
};

export const getRandomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const genCode = () => {
    return getRandomInt(9999, 99999);
};