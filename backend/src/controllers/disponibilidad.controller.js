const disponibilidadService = require('../services/disponibilidad.service');

const consultar = async (req, res, next) => {
  try {
    const { fecha, hora, personas, ubicacion } = req.query;
    const resultado = await disponibilidadService.consultarDisponibilidad({
      fecha,
      hora,
      personas,
      ubicacion,
    });
    res.status(200).json({ ok: true, data: resultado });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  consultar,
};
