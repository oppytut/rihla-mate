declare module "midtrans-client" {
  interface SnapTransactionDetails {
    order_id: string;
    gross_amount: number;
  }

  interface SnapCreditCard {
    secure: boolean;
  }

  interface SnapCustomerDetails {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  }

  interface SnapItemDetail {
    id?: string;
    price: number;
    quantity: number;
    name: string;
    category?: string;
  }

  interface SnapCallbacks {
    finish?: string;
    error?: string;
    pending?: string;
  }

  interface SnapParameter {
    transaction_details: SnapTransactionDetails;
    credit_card?: SnapCreditCard;
    customer_details?: SnapCustomerDetails;
    item_details?: SnapItemDetail[];
    callbacks?: SnapCallbacks;
  }

  interface SnapTransactionResult {
    token: string;
    redirect_url: string;
  }

  interface CoreApiTransactionStatus {
    order_id: string;
    transaction_status: string;
    fraud_status: string;
    status_code: string;
    gross_amount: string;
    signature_key: string;
    payment_type: string;
    transaction_id: string;
    [key: string]: unknown;
  }

  interface SnapConfig {
    isProduction: boolean;
    serverKey: string;
    clientKey: string;
  }

  export class Snap {
    constructor(config: SnapConfig);
    createTransaction(parameter: SnapParameter): Promise<SnapTransactionResult>;
    createTransactionToken(parameter: SnapParameter): Promise<string>;
    createTransactionRedirectUrl(parameter: SnapParameter): Promise<string>;
  }

  export class CoreApi {
    constructor(config: SnapConfig);
    transaction: {
      status(orderId: string): Promise<CoreApiTransactionStatus>;
    };
  }
}
