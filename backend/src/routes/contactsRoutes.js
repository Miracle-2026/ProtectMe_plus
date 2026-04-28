const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const {
    addContact,
    getContacts,
    deleteContact
} = require('../controllers/contactsController');

router.post('/', authenticate, addContact);
router.get('/', authenticate, getContacts);
router.delete('/:id', authenticate, deleteContact);

module.exports = router;