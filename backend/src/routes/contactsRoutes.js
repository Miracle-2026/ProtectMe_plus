const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const {
    addContact,
    getContacts,
    deleteContact,
    toggleBlockContact
} = require('../controllers/contactsController');

router.post('/', authenticate, addContact);
router.get('/', authenticate, getContacts);
router.delete('/:id', authenticate, deleteContact);

router.patch('/:id/block', authenticate, toggleBlockContact);

module.exports = router;