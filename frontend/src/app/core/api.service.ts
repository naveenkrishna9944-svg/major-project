import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './config';

/** Every API response uses the same envelope: { status, message, data } */
export interface ApiEnvelope<T = any> {
  status: boolean;
  message: string;
  data: T;
}

/** Pulls the server's error message out of a failed HTTP call (falls back to a default text). */
export function errMsg(err: any, fallback: string): string {
  return err?.error?.message || fallback;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  readonly base = API_BASE_URL;

  /** Public URL of an uploaded file, e.g. "uploads/products/prod_1.png" */
  uploads = (path: string) => `${API_BASE_URL}/${path}`;

  private get<T = any>(url: string, params?: Record<string, any>) {
    let httpParams = new HttpParams();
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v !== undefined && v !== null) httpParams = httpParams.set(k, String(v));
    }
    return firstValueFrom(this.http.get<ApiEnvelope<T>>(`${API_BASE_URL}${url}`, { params: httpParams }));
  }

  private post<T = any>(url: string, body?: any) {
    return firstValueFrom(this.http.post<ApiEnvelope<T>>(`${API_BASE_URL}${url}`, body ?? {}));
  }

  // Auth
  login = (data: any) => this.post('/api/auth/login', data);
  logout = () => this.post('/api/auth/logout');
  checkSession = () => this.get('/api/auth/check_session');
  changePassword = (data: any) => this.post('/api/auth/change_password', data);

  // Dashboard
  getStats = () => this.get('/api/dashboard/stats');
  getCharts = () => this.get('/api/dashboard/charts');

  // Products
  getProducts = (params?: Record<string, any>) => this.get('/api/products/get_products', params);
  getProduct = (id: number) => this.get('/api/products/get_product', { id });
  addProduct = (formData: FormData) => this.post('/api/products/add_product', formData);
  updateProduct = (formData: FormData) => this.post('/api/products/update_product', formData);
  deleteProduct = (id: number) => this.post('/api/products/delete_product', { id });

  // Categories
  getCategories = () => this.get('/api/categories/get_categories');
  addCategory = (data: any) => this.post('/api/categories/add_category', data);
  updateCategory = (data: any) => this.post('/api/categories/update_category', data);
  deleteCategory = (id: number) => this.post('/api/categories/delete_category', { id });

  // Suppliers
  getSuppliers = () => this.get('/api/suppliers/get_suppliers');
  addSupplier = (data: any) => this.post('/api/suppliers/add_supplier', data);
  updateSupplier = (data: any) => this.post('/api/suppliers/update_supplier', data);
  deleteSupplier = (id: number) => this.post('/api/suppliers/delete_supplier', { id });
  getSupplierDetails = (id: number) => this.get('/api/suppliers/get_supplier_details', { id });

  // Customers
  getCustomers = () => this.get('/api/customers/get_customers');
  addCustomer = (data: any) => this.post('/api/customers/add_customer', data);
  updateCustomer = (data: any) => this.post('/api/customers/update_customer', data);
  deleteCustomer = (id: number) => this.post('/api/customers/delete_customer', { id });

  // Inventory
  stockIn = (data: any) => this.post('/api/inventory/stock_in', data);
  stockOut = (data: any) => this.post('/api/inventory/stock_out', data);
  getStockHistory = (product_id?: number) => this.get('/api/inventory/get_stock_history', { product_id });
  getLowStock = () => this.get('/api/inventory/low_stock');
  getOutOfStock = () => this.get('/api/inventory/out_of_stock');
  getExpiryCenter = () => this.get('/api/inventory/expiry_center');
  sendReorder = (product_id: number) => this.post('/api/inventory/reorder', { product_id });

  // POS / Sales
  posSearchProducts = (q: string) => this.get('/api/pos/search_products', { q });
  createSale = (data: any) => this.post('/api/pos/create_sale', data);
  getInvoice = (sale_id: number) => this.get('/api/pos/get_invoice', { sale_id });
  getSales = () => this.get('/api/sales/get_sales');
  getSaleDetails = (id: number) => this.get('/api/sales/get_sale_details', { id });
  deleteSale = (id: number) => this.post('/api/sales/delete_sale', { id });

  // Employees
  getEmployees = () => this.get('/api/employees/get_employees');
  addEmployee = (data: any) => this.post('/api/employees/add_employee', data);
  updateEmployee = (data: any) => this.post('/api/employees/update_employee', data);
  deleteEmployee = (id: number) => this.post('/api/employees/delete_employee', { id });

  // Purchases
  getPurchases = () => this.get('/api/purchases/get_purchases');
  getPurchaseDetails = (id: number) => this.get('/api/purchases/get_purchase_details', { id });
  createPurchase = (data: any) => this.post('/api/purchases/create_purchase', data);
  receivePurchase = (id: number) => this.post('/api/purchases/receive_purchase', { id });
  cancelPurchase = (id: number) => this.post('/api/purchases/cancel_purchase', { id });

  // Reports
  getSalesReport = (from: string, to: string) => this.get('/api/reports/sales_report', { from, to });
  getProductReport = () => this.get('/api/reports/product_report');
  getInventoryReport = () => this.get('/api/reports/inventory_report');
  getCustomerReport = () => this.get('/api/reports/customer_report');
  getSupplierReport = () => this.get('/api/reports/supplier_report');

  // Notifications
  getNotifications = () => this.get('/api/notifications/get_notifications');
  markNotificationRead = (id: number) => this.post('/api/notifications/mark_read', { id });
  deleteNotification = (id: number) => this.post('/api/notifications/delete_notification', { id });

  // Settings
  getSettings = () => this.get('/api/settings/get_settings');
  updateSettings = (data: any) => this.post('/api/settings/update_settings', data);
}
