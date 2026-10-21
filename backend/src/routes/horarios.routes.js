const express = require('express');
const router = express.Router();
const horariosController = require('../controllers/horarios.controller');

router.get('/', horariosController.getAll);
router.get('/dia/:dia', horariosController.getByDia);
router.put('/:id', horariosController.update);

module.exports = router;
