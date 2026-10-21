const express = require('express');
const router = express.Router();
const mesasController = require('../controllers/mesas.controller');

router.get('/', mesasController.getAll);
router.get('/:id', mesasController.getById);
router.post('/', mesasController.create);
router.put('/:id', mesasController.update);
router.delete('/:id', mesasController.remove);

module.exports = router;
