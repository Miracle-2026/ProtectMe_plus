const CryptoJS = require('crypto-js');
const dotenv = require('dotenv');

dotenv.config();

const SECRET_KEY = process.env.AES_SECRET;

const encrypt = (plainText) => {
    if (!plainText) return null;
    return CryptoJS.AES.encrypt(plainText.toString(), SECRET_KEY).toString();
};

const decrypt = (cipherText) => {
    if (!cipherText) return null;
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
};

module.exports = {encrypt, decrypt};