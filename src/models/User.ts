export default interface User {
  id: number;
  name: string;
  profilePicture: string;
  //pin should be a 4 digit number
  pin: string;
  pinnedProductIds?: number[];
}
