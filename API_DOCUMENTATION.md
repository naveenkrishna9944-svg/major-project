# API Documentation

Base URL: `http://localhost:5000`

All endpoints return JSON in the format:
```json
{ "status": true, "message": "...", "data": ... }
```

Session cookie auth — the frontend sends `withCredentials: true`. Endpoints marked
**Auth required** return `401` if there's no active session; **Admin only** returns `403`
for non-admin users.

## Auth
| Method | Endpoint | Auth | Body |
|---|---|---|---|
| POST | /api/auth/login | No | `{ email, password }` |
| POST | /api/auth/logout | Yes | — |
| GET  | /api/auth/check_session | Yes | — |
| POST | /api/auth/change_password | Yes | `{ current_password, new_password, confirm_password }` |

## Dashboard
| Method | Endpoint | Auth |
|---|---|---|
| GET | /api/dashboard/stats | Yes |
| GET | /api/dashboard/charts | Yes |

## Products
| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | /api/products/get_products | Yes | `?search=&category_id=` |
| GET | /api/products/get_product | Yes | `?id=` |
| POST | /api/products/add_product | Yes | multipart/form-data (image optional) |
| POST | /api/products/update_product | Yes | multipart/form-data |
| POST | /api/products/delete_product | Yes | `{ id }` |

## Categories
| Method | Endpoint | Auth |
|---|---|---|
| GET | /api/categories/get_categories | Yes |
| POST | /api/categories/add_category | Yes |
| POST | /api/categories/update_category | Yes |
| POST | /api/categories/delete_category | Yes (blocked if products exist) |

## Suppliers
| Method | Endpoint | Auth |
|---|---|---|
| GET | /api/suppliers/get_suppliers | Yes |
| GET | /api/suppliers/get_supplier_details | Yes | `?id=` |
| POST | /api/suppliers/add_supplier | Yes |
| POST | /api/suppliers/update_supplier | Yes |
| POST | /api/suppliers/delete_supplier | Yes |

## Customers
| Method | Endpoint | Auth |
|---|---|---|
| GET | /api/customers/get_customers | Yes |
| POST | /api/customers/add_customer | Yes |
| POST | /api/customers/update_customer | Yes |
| POST | /api/customers/delete_customer | Yes |

## Inventory
| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| POST | /api/inventory/stock_in | Yes | `{ product_id, quantity, notes }` |
| POST | /api/inventory/stock_out | Yes | `{ product_id, quantity, reason }` |
| GET | /api/inventory/get_stock_history | Yes | `?product_id=` optional |
| GET | /api/inventory/low_stock | Yes | |
| GET | /api/inventory/out_of_stock | Yes | |
| GET | /api/inventory/expiry_center | Yes | products expiring within 30 days |
| POST | /api/inventory/reorder | Yes | `{ product_id }` — creates a reorder_request |

## POS / Sales
| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | /api/pos/search_products | Yes | `?q=` |
| POST | /api/pos/create_sale | Yes | `{ items:[{product_id, quantity}], customer_id, discount, payment_method }` — transactional |
| GET | /api/pos/get_invoice | Yes | `?sale_id=` |
| GET | /api/sales/get_sales | Yes | |
| GET | /api/sales/get_sale_details | Yes | `?id=` |
| POST | /api/sales/delete_sale | Admin | `{ id }` |

## Purchases
| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | /api/purchases/get_purchases | Yes | |
| GET | /api/purchases/get_purchase_details | Yes | `?id=` |
| POST | /api/purchases/create_purchase | Yes | `{ supplier_id, items:[{product_id, quantity, purchase_price}], payment_status, notes }` |
| POST | /api/purchases/receive_purchase | Yes | `{ id }` — transactional, increases stock |
| POST | /api/purchases/cancel_purchase | Yes | `{ id }` — only works on Pending orders |

## Reports
| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | /api/reports/sales_report | Yes | `?from=YYYY-MM-DD&to=YYYY-MM-DD` |
| GET | /api/reports/product_report | Yes | best-selling + slow-moving |
| GET | /api/reports/inventory_report | Yes | stock valuation per product |
| GET | /api/reports/customer_report | Yes | top 20 by spend |
| GET | /api/reports/supplier_report | Yes | orders + purchase totals |

## Employees
| Method | Endpoint | Auth |
|---|---|---|
| GET | /api/employees/get_employees | Yes |
| POST | /api/employees/add_employee | Admin |
| POST | /api/employees/update_employee | Admin |
| POST | /api/employees/delete_employee | Admin |

## Notifications
| Method | Endpoint | Auth |
|---|---|---|
| GET | /api/notifications/get_notifications | Yes |
| POST | /api/notifications/mark_read | Yes | `{ id }` (omit id to mark all read) |
| POST | /api/notifications/delete_notification | Yes | `{ id }` |

## Settings
| Method | Endpoint | Auth |
|---|---|---|
| GET | /api/settings/get_settings | Yes |
| POST | /api/settings/update_settings | Admin |

---

### Example — Login

Request:
```json
POST /api/auth/login
{ "email": "admin@mart.com", "password": "admin123" }
```

Response:
```json
{
  "status": true,
  "message": "Login successful.",
  "data": { "id": 1, "name": "Admin User", "email": "admin@mart.com", "role": "Admin" }
}
```

### Example — Create Sale

Request:
```json
POST /api/pos/create_sale
{
  "items": [{ "product_id": 2, "quantity": 3 }],
  "customer_id": null,
  "discount": 2,
  "payment_method": "Cash"
}
```

Response:
```json
{
  "status": true,
  "message": "Sale completed successfully.",
  "data": {
    "sale_id": 5,
    "invoice_number": "INV-20260719-AB12CD",
    "subtotal": 27,
    "discount": 2,
    "tax": 1.25,
    "grand_total": 26.25
  }
}
```
