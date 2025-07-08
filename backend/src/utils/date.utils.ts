export const isAccessUrlExpired = (url: string): boolean => {
  const timeRegex = new RegExp(/[\d]{8}T[\d]{6}Z/);
  const createdUrlDateIndex = url.search(timeRegex);
  const accessUrlCreatedDate = new Date(
    url
      .slice(createdUrlDateIndex, createdUrlDateIndex + 16)
      .replace(
        /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
        '$1-$2-$3T$4:$5:$6Z'
      )
  );
 
  return new Date().getTime() > accessUrlCreatedDate.getTime() + 3600000
}
