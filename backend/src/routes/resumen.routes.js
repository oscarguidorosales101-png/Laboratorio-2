const express = require('express');
const router = express.Router();
const resumenController = require('../controllers/resumen.controller');

router.get('/', resumenController.getResumen);

module.exports = router;
