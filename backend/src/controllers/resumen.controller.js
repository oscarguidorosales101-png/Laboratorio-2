const resumenService = require('../services/resumen.service');

const getResumen = async (req, res, next) => {
  try {
    const { fecha } = req.query;
    const data = await resumenService.getResumen(fecha);
    res.status(200).json({ ok: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getResumen,
};
