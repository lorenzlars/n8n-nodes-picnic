declare module 'picnic-api' {
  interface PicnicOptions {
    userId?: string;
    password?: string;
    countryCode?: string;
    apiVersion?: number;
    authKey?: string;
  }

  class PicnicAPI {
    constructor(options: PicnicOptions);
    login(): Promise<unknown>;
    search(query: string): Promise<unknown>;
    getCart(): Promise<unknown>;
    addProductToShoppingCart(productId: string, count: number): Promise<unknown>;
    clearCart(): Promise<unknown>;
    getDeliveries(): Promise<unknown>;
    getUserDetails(): Promise<unknown>;
  }

  export default PicnicAPI;
}
