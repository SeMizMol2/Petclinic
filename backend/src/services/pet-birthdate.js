const todayInThailand = () => new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);

const petBirthdateError = (value) => {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return 'วันเกิดสัตว์เลี้ยงต้องเป็นวันที่ที่ถูกต้อง';
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return 'วันเกิดสัตว์เลี้ยงต้องเป็นวันที่ที่ถูกต้อง';
  }
  if (value > todayInThailand()) return 'วันเกิดสัตว์เลี้ยงต้องไม่เป็นวันในอนาคต';
  return null;
};

module.exports = { petBirthdateError };
