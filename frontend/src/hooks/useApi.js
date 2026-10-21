import { useState, useEffect, useCallback } from 'react';

/**
 * Hook personalizado para gestionar peticiones asíncronas con estados de datos, carga y error
 * @param {Function} apiFunc Función de API que retorna una promesa
 * @param {Array} dependencies Dependencias para volver a disparar la petición automáticamente
 * @param {boolean} immediate Ejecutar inmediatamente al montar
 */
export function useApi(apiFunc, dependencies = [], immediate = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiFunc(...args);
        setData(result);
        return { data: result, error: null };
      } catch (err) {
        setError(err.message || 'Error inesperado al cargar datos');
        return { data: null, error: err };
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...dependencies]
  );

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return {
    data,
    loading,
    error,
    setData,
    refetch: execute,
  };
}

export default useApi;
