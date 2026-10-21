const express = require('express');
const router = express.Router();
const reservasController = require('../controllers/reservas.controller');

router.get('/', reservasController.getAll);
router.get('/:id', reservasController.getById);
router.post('/', reservasController.create);
router.put('/:id', reservasController.update);
router.patch('/:id/estado', reservasController.updateEstado);
router.delete('/:id', reservasController.remove);

module.exports = router;
