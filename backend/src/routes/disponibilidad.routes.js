const express = require('express');
const router = express.Router();
const disponibilidadController = require('../controllers/disponibilidad.controller');

router.get('/', disponibilidadController.consultar);

module.exports = router;
