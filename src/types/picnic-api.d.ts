declare module 'picnic-api' {
  interface PicnicOptions {
    countryCode?: string;
    apiVersion?: number | string;
    authKey?: string;
  }

  class PicnicAPI {
    constructor(options: PicnicOptions);
    login(userId: string, password: string): Promise<unknown>;
    search(query: string): Promise<unknown>;
    getCart(): Promise<unknown>;
    addProductToShoppingCart(productId: string, count: number): Promise<unknown>;
    clearCart(): Promise<unknown>;
    getDeliveries(): Promise<unknown>;
    getUserDetails(): Promise<unknown>;
  }

  export default PicnicAPI;
}
