export const splitSortParam = (sort) => {
  if (!sort || typeof sort !== 'string') {
    return [];
  }

  return sort
    .split(',')
    .reduce((acc, part, index, parts) => {
      if (index % 2 === 0) {
        acc.push(parts[index + 1] ? `${part},${parts[index + 1]}` : part);
      }
      return acc;
    }, []);
};

export const buildSortAwareSerializer = (sortValues = []) => (config) => {
  const search = new URLSearchParams();

  Object.entries(config).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    search.append(key, value);
  });

  sortValues.forEach((value) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append('sort', value);
    }
  });

  return search.toString();
};
