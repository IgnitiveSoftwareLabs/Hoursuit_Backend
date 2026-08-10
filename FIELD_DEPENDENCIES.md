# FIELD_DEPENDENCIES
## Extracted Model Field Dependencies
- The following sections describe field-level dependencies inferred from code usage and controller access patterns.

### attachment (`modals/attachments/attachment.ts`)
- Fields: fileName, filePath, id, mimeType, relatedId, relatedType, type, validTill
- Usage categories:
  - `fileName`: defined_in (1), used_in (4), controllers (4), search_filter (4), imported_in (3), reports (1), services (1)
  - `filePath`: defined_in (1), used_in (3), controllers (3), search_filter (3), imported_in (3), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (3), reports (4), services (14)
  - `mimeType`: defined_in (1), used_in (5), controllers (3), search_filter (5), imported_in (3), reports (1), services (1)
  - `relatedId`: defined_in (1), used_in (3), controllers (3), search_filter (3), imported_in (3), reports (1), services (1)
  - `relatedType`: defined_in (1), used_in (3), controllers (3), search_filter (3), imported_in (3), reports (1), services (1)
  - `type`: defined_in (1), validated_in (1), used_in (59), controllers (7), routers (1), search_filter (12), imported_in (3), exported_in (1), reports (2), services (8)
  - `validTill`: defined_in (1), used_in (3), controllers (3), search_filter (3), imported_in (3), reports (1), services (1)

### category (`modals/masters/category/category.ts`)
- Fields: CompanyId, id, isActive, item_category_name, references, subsidiary_id, user_id
- Usage categories:
  - `CompanyId`: defined_in (1), validated_in (19), used_in (61), controllers (28), routers (1), search_filter (28), imported_in (3), reports (1), services (8)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (3), reports (4), services (14)
  - `isActive`: defined_in (1), validated_in (22), used_in (45), controllers (20), search_filter (24), imported_in (3), reports (1), services (6)
  - `item_category_name`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (3), reports (1), services (1)
  - `references`: defined_in (1), used_in (28), search_filter (2), imported_in (3), reports (1), services (4)
  - `subsidiary_id`: defined_in (1), validated_in (11), used_in (28), controllers (13), search_filter (14), imported_in (3), reports (1), services (8)
  - `user_id`: defined_in (1), validated_in (25), used_in (53), controllers (24), search_filter (25), imported_in (3), reports (1), services (6)

### city (`modals/masters/city/city.ts`)
- Fields: city_name, id, references, state_code_id
- Usage categories:
  - `city_name`: defined_in (1), used_in (4), controllers (4), search_filter (4), imported_in (11), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (11), reports (4), services (14)
  - `references`: defined_in (1), used_in (28), search_filter (2), imported_in (11), reports (1), services (4)
  - `state_code_id`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (3), imported_in (11), reports (1), services (1)

### commodity (`modals/commodity/commodity.ts`)
- Fields: CompanyId, commodity_id, created_at, description, gain_loss_threshold, name, references, unit_type, units
- Usage categories:
  - `CompanyId`: defined_in (1), validated_in (20), used_in (61), controllers (28), routers (1), search_filter (28), imported_in (2), reports (1), services (8)
  - `commodity_id`: defined_in (1), used_in (2), controllers (2), search_filter (2), imported_in (2), reports (1), services (1)
  - `created_at`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (2), reports (1), services (1)
  - `description`: defined_in (1), validated_in (3), used_in (12), controllers (5), search_filter (5), imported_in (2), reports (1), services (2)
  - `gain_loss_threshold`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (2), reports (1), services (1)
  - `name`: defined_in (1), validated_in (2), used_in (39), controllers (24), routers (3), search_filter (25), imported_in (2), reports (1), services (7)
  - `references`: defined_in (1), used_in (28), search_filter (2), imported_in (2), reports (1), services (4)
  - `unit_type`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (2), reports (1), services (1)
  - `units`: defined_in (1), used_in (2), controllers (2), search_filter (2), imported_in (2), reports (1), services (1)

### company (`modals/company/company.ts`)
- Fields: UserId, address, contactPerson, gstEnabled, gstNumber, id, name, panNumber, phone, references
- Usage categories:
  - `UserId`: defined_in (1), used_in (4), controllers (3), search_filter (4), imported_in (43), reports (1), services (1)
  - `address`: defined_in (1), validated_in (1), used_in (7), controllers (3), search_filter (6), imported_in (43), reports (1), services (2)
  - `contactPerson`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (43), reports (1), services (1)
  - `gstEnabled`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (43), reports (1), services (1)
  - `gstNumber`: defined_in (1), used_in (3), controllers (2), search_filter (2), imported_in (43), reports (1), services (2)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (43), reports (4), services (14)
  - `name`: defined_in (1), validated_in (2), used_in (39), controllers (24), routers (3), search_filter (25), imported_in (43), reports (1), services (7)
  - `panNumber`: defined_in (1), imported_in (43), reports (1), services (1)
  - `phone`: defined_in (1), used_in (2), controllers (2), search_filter (2), imported_in (43), reports (1), services (1)
  - `references`: defined_in (1), used_in (28), search_filter (2), imported_in (43), reports (1), services (4)

### currencyMaster (`modals/masters/currency/currencyMaster.ts`)
- Fields: country_name, currency_code, currency_name, currency_symbol, decimal_places, id, isActive
- Usage categories:
  - `country_name`: defined_in (1), used_in (1), controllers (1), imported_in (6), reports (1), services (1)
  - `currency_code`: defined_in (1), used_in (2), controllers (2), search_filter (1), imported_in (6), reports (1), services (1)
  - `currency_name`: defined_in (1), used_in (2), controllers (2), search_filter (1), imported_in (6), reports (1), services (1)
  - `currency_symbol`: defined_in (1), used_in (1), controllers (1), imported_in (6), reports (1), services (1)
  - `decimal_places`: defined_in (1), used_in (1), controllers (1), imported_in (6), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (6), reports (4), services (14)
  - `isActive`: defined_in (1), validated_in (22), used_in (45), controllers (20), search_filter (24), imported_in (6), reports (1), services (6)

### customer (`modals/masters/customer/customer.ts`)
- Fields: CompanyId, aadharNumber, address, category, city, contact, contactPersonEmail, contactPersonName, contactPersonPhoneNumber, credit_limit, currency_id, customer_type, district, email, fatherName, gstNumber, id, name, officeAddress, pan_avl_id, pan_no, pin_code, post, references, registration_type_id, state, subsidiary_id, tehsil, village
- Usage categories:
  - `CompanyId`: defined_in (1), validated_in (20), used_in (61), controllers (28), routers (1), search_filter (28), imported_in (14), reports (1), services (7)
  - `aadharNumber`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (14), reports (1), services (1)
  - `address`: defined_in (1), validated_in (1), used_in (7), controllers (3), search_filter (6), imported_in (14), reports (1), services (1)
  - `category`: defined_in (1), used_in (13), controllers (4), routers (3), search_filter (5), imported_in (14), reports (4), services (8)
  - `city`: defined_in (1), used_in (16), controllers (6), routers (1), search_filter (8), imported_in (14), reports (3), services (5)
  - `contact`: defined_in (1), used_in (2), controllers (2), search_filter (2), imported_in (14), reports (1), services (1)
  - `contactPersonEmail`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (14), reports (1), services (1)
  - `contactPersonName`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (14), reports (1), services (1)
  - `contactPersonPhoneNumber`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (14), reports (1), services (1)
  - `credit_limit`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (14), reports (1), services (1)
  - `currency_id`: defined_in (1), validated_in (2), used_in (4), controllers (2), search_filter (3), imported_in (14), reports (1), services (1)
  - `customer_type`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (14), reports (1), services (1)
  - `district`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (14), reports (1), services (1)
  - `email`: defined_in (1), validated_in (1), used_in (7), controllers (6), search_filter (6), imported_in (14), reports (1), services (2)
  - `fatherName`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (14), reports (1), services (1)
  - `gstNumber`: defined_in (1), used_in (3), controllers (2), search_filter (2), imported_in (14), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (14), reports (4), services (13)
  - `name`: defined_in (1), validated_in (2), used_in (39), controllers (24), routers (3), search_filter (25), imported_in (14), reports (1), services (6)
  - `officeAddress`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (14), reports (1), services (1)
  - `pan_avl_id`: defined_in (1), validated_in (1), used_in (2), controllers (1), search_filter (2), imported_in (14), reports (1), services (1)
  - `pan_no`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (14), reports (1), services (1)
  - `pin_code`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (14), reports (1), services (1)
  - `post`: defined_in (1), used_in (37), controllers (1), routers (35), search_filter (2), imported_in (14), reports (2), services (5)
  - `references`: defined_in (1), used_in (28), search_filter (2), imported_in (14), reports (1), services (3)
  - `registration_type_id`: defined_in (1), validated_in (1), used_in (2), controllers (1), search_filter (2), imported_in (14), reports (1), services (1)
  - `state`: defined_in (1), used_in (11), controllers (4), routers (1), search_filter (6), imported_in (14), reports (3), services (5)
  - `subsidiary_id`: defined_in (1), validated_in (12), used_in (28), controllers (13), search_filter (14), imported_in (14), reports (1), services (7)
  - `tehsil`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (14), reports (1), services (1)
  - `village`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (14), reports (1), services (1)

### deliveryChallanHeader (`modals/Transactions/sales/deliveryChallan/deliveryChallanHeader.ts`)
- Fields: challanDate, challanNumber, cityId, companyId, customerId, deliveredDate, dispatchDate, driverName, driverPhone, id, remarks, salesOrderHeaderId, shippingAddress, status, subsidiaryId, transportationModeId, transporterName, uom_id, user_id, vehicleNumber, warehouseId
- Usage categories:
  - `challanDate`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (2), reports (1), services (1)
  - `challanNumber`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (2), reports (1), services (1)
  - `cityId`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (2), reports (1), services (1)
  - `companyId`: defined_in (1), validated_in (3), used_in (14), controllers (7), search_filter (7), imported_in (2), reports (1), services (1)
  - `customerId`: defined_in (1), validated_in (1), used_in (6), controllers (4), search_filter (4), imported_in (2), reports (1), services (1)
  - `deliveredDate`: defined_in (1), used_in (3), controllers (2), search_filter (2), imported_in (2), reports (1), services (1)
  - `dispatchDate`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (2), reports (1), services (1)
  - `driverName`: defined_in (1), validated_in (2), used_in (5), controllers (3), search_filter (3), imported_in (2), reports (1), services (1)
  - `driverPhone`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (2), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (2), reports (4), services (14)
  - `remarks`: defined_in (1), validated_in (12), used_in (23), controllers (8), search_filter (8), imported_in (2), reports (1), services (1)
  - `salesOrderHeaderId`: defined_in (1), used_in (5), controllers (3), search_filter (3), imported_in (2), reports (1), services (1)
  - `shippingAddress`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (2), reports (1), services (1)
  - `status`: defined_in (1), validated_in (8), used_in (62), controllers (36), routers (9), search_filter (39), approval_workflow (62), imported_in (2), reports (3), services (5)
  - `subsidiaryId`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (2), reports (1), services (1)
  - `transportationModeId`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (2), reports (1), services (1)
  - `transporterName`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (2), reports (1), services (1)
  - `uom_id`: defined_in (1), validated_in (4), used_in (12), controllers (5), search_filter (6), imported_in (2), reports (1), services (4)
  - `user_id`: defined_in (1), validated_in (25), used_in (53), controllers (24), search_filter (25), imported_in (2), reports (1), services (6)
  - `vehicleNumber`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (2), reports (1), services (1)
  - `warehouseId`: defined_in (1), validated_in (3), used_in (12), controllers (7), routers (1), search_filter (9), imported_in (2), reports (1), services (1)

### deliveryChallanLine (`modals/Transactions/sales/deliveryChallan/deliveryChallanLine.ts`)
- Fields: batchNo, deliveryChallanHeaderId, dispatchQty, id, itemId, lineTotal, remarks, salesOrderLineId, unitPrice
- Usage categories:
  - `batchNo`: defined_in (1), validated_in (4), used_in (11), controllers (6), search_filter (6), imported_in (2), reports (1), services (1)
  - `deliveryChallanHeaderId`: defined_in (1), used_in (3), controllers (2), search_filter (2), imported_in (2), reports (1), services (1)
  - `dispatchQty`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (2), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (2), reports (4), services (14)
  - `itemId`: defined_in (1), validated_in (4), used_in (14), controllers (7), routers (1), search_filter (8), imported_in (2), reports (2), services (1)
  - `lineTotal`: defined_in (1), validated_in (1), used_in (8), controllers (5), search_filter (5), imported_in (2), reports (1), services (1)
  - `remarks`: defined_in (1), validated_in (12), used_in (23), controllers (8), search_filter (8), imported_in (2), reports (1), services (1)
  - `salesOrderLineId`: defined_in (1), used_in (3), controllers (2), search_filter (2), imported_in (2), reports (1), services (1)
  - `unitPrice`: defined_in (1), validated_in (2), used_in (9), controllers (5), search_filter (5), imported_in (2), reports (1), services (1)

### employee (`modals/masters/Employee/employee.ts`)
- Fields: city_id, company_id, designation, id, isActive, references, subsidiary_id, user_id
- Usage categories:
  - `city_id`: defined_in (1), validated_in (2), used_in (10), controllers (4), search_filter (6), imported_in (1), reports (1), services (1)
  - `company_id`: defined_in (1), validated_in (4), used_in (10), controllers (4), search_filter (5), imported_in (1), reports (1), services (1)
  - `designation`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (1), reports (4), services (14)
  - `isActive`: defined_in (1), validated_in (22), used_in (45), controllers (20), search_filter (24), imported_in (1), reports (1), services (6)
  - `references`: defined_in (1), used_in (28), search_filter (2), imported_in (1), reports (1), services (4)
  - `subsidiary_id`: defined_in (1), validated_in (11), used_in (28), controllers (13), search_filter (14), imported_in (1), reports (1), services (8)
  - `user_id`: defined_in (1), validated_in (25), used_in (53), controllers (24), search_filter (25), imported_in (1), reports (1), services (6)

### godown (`modals/masters/godown/godown.ts`)
- Fields: WarehouseId, availableCapacity, availableVolume, breadth, capacity, capacityUnit, height, id, length, location, name, references, sizeUnit
- Usage categories:
  - `WarehouseId`: defined_in (1), used_in (3), controllers (1), routers (1), search_filter (2), imported_in (11), reports (1), services (1)
  - `availableCapacity`: defined_in (1), used_in (3), controllers (2), search_filter (2), imported_in (11), reports (1), services (1)
  - `availableVolume`: defined_in (1), used_in (3), controllers (2), search_filter (2), imported_in (11), reports (1), services (1)
  - `breadth`: defined_in (1), used_in (3), controllers (2), search_filter (2), imported_in (11), reports (1), services (1)
  - `capacity`: defined_in (1), used_in (3), controllers (2), search_filter (2), imported_in (11), reports (1), services (1)
  - `capacityUnit`: defined_in (1), used_in (3), controllers (2), search_filter (2), imported_in (11), reports (1), services (1)
  - `height`: defined_in (1), used_in (3), controllers (2), search_filter (2), imported_in (11), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (11), reports (4), services (14)
  - `length`: defined_in (1), validated_in (1), used_in (25), controllers (19), search_filter (21), imported_in (11), reports (1), services (1)
  - `location`: defined_in (1), validated_in (1), used_in (11), controllers (6), routers (1), search_filter (8), imported_in (11), reports (2), services (2)
  - `name`: defined_in (1), validated_in (2), used_in (39), controllers (24), routers (3), search_filter (25), imported_in (11), reports (1), services (7)
  - `references`: defined_in (1), used_in (28), search_filter (2), imported_in (11), reports (1), services (4)
  - `sizeUnit`: defined_in (1), used_in (3), controllers (2), search_filter (2), imported_in (11), reports (1), services (1)

### GRNHeader (`modals/Transactions/purchase/GRN/GRNHeader.ts`)
- Fields: CompanyId, driverName, godownId, grnDate, grnNo, id, purchaseOrderId, references, remarks, stackId, status, user_id, vehicleNo, warehouseId
- Usage categories:
  - `CompanyId`: defined_in (1), validated_in (19), used_in (61), controllers (28), routers (1), search_filter (28), imported_in (2), reports (1), services (8)
  - `driverName`: defined_in (1), validated_in (2), used_in (5), controllers (3), search_filter (3), imported_in (2), reports (1), services (1)
  - `godownId`: defined_in (1), validated_in (2), used_in (10), controllers (6), routers (1), search_filter (8), imported_in (2), reports (1), services (1)
  - `grnDate`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (2), reports (1), services (1)
  - `grnNo`: defined_in (1), used_in (3), controllers (3), search_filter (3), imported_in (2), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (2), reports (4), services (14)
  - `purchaseOrderId`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (2), reports (1), services (1)
  - `references`: defined_in (1), used_in (28), search_filter (2), imported_in (2), reports (1), services (4)
  - `remarks`: defined_in (1), validated_in (12), used_in (23), controllers (8), search_filter (8), imported_in (2), reports (1), services (1)
  - `stackId`: defined_in (1), validated_in (1), used_in (5), controllers (3), search_filter (4), imported_in (2), reports (1), services (1)
  - `status`: defined_in (1), validated_in (8), used_in (62), controllers (36), routers (9), search_filter (39), approval_workflow (62), imported_in (2), reports (3), services (5)
  - `user_id`: defined_in (1), validated_in (25), used_in (53), controllers (24), search_filter (25), imported_in (2), reports (1), services (6)
  - `vehicleNo`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (2), reports (1), services (1)
  - `warehouseId`: defined_in (1), validated_in (3), used_in (12), controllers (7), routers (1), search_filter (9), imported_in (2), reports (1), services (1)

### GRNLine (`modals/Transactions/purchase/GRN/GRNLine.ts`)
- Fields: CompanyId, acceptedQty, batchNo, expiryDate, grnHeaderId, id, itemId, manufacturingDate, orderedQty, purchaseOrderLineId, qcRequired, receivedQty, references, rejectedQty, remarks, serialNo, status, user_id
- Usage categories:
  - `CompanyId`: defined_in (1), validated_in (19), used_in (61), controllers (28), routers (1), search_filter (28), imported_in (1), reports (1), services (8)
  - `acceptedQty`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `batchNo`: defined_in (1), validated_in (4), used_in (11), controllers (6), search_filter (6), imported_in (1), reports (1), services (1)
  - `expiryDate`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `grnHeaderId`: defined_in (1), validated_in (2), used_in (7), controllers (4), search_filter (4), imported_in (1), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (1), reports (4), services (14)
  - `itemId`: defined_in (1), validated_in (4), used_in (14), controllers (7), routers (1), search_filter (8), imported_in (1), reports (2), services (1)
  - `manufacturingDate`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `orderedQty`: defined_in (1), used_in (4), controllers (3), search_filter (3), imported_in (1), reports (1), services (1)
  - `purchaseOrderLineId`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `qcRequired`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `receivedQty`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `references`: defined_in (1), used_in (28), search_filter (2), imported_in (1), reports (1), services (4)
  - `rejectedQty`: defined_in (1), validated_in (2), used_in (7), controllers (4), search_filter (4), imported_in (1), reports (1), services (1)
  - `remarks`: defined_in (1), validated_in (12), used_in (23), controllers (8), search_filter (8), imported_in (1), reports (1), services (1)
  - `serialNo`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `status`: defined_in (1), validated_in (8), used_in (62), controllers (36), routers (9), search_filter (39), approval_workflow (62), imported_in (1), reports (3), services (5)
  - `user_id`: defined_in (1), validated_in (25), used_in (53), controllers (24), search_filter (25), imported_in (1), reports (1), services (6)

### HSNSACMaster (`modals/masters/HSN-SAC/HSNSACMaster.ts`)
- Fields: CompanyId, code, description, id, isActive, references, subsidiary_id, taxPercentage, type, user_id, validate
- Usage categories:
  - `CompanyId`: defined_in (1), validated_in (19), used_in (61), controllers (28), routers (1), search_filter (28), imported_in (8), reports (1), services (8)
  - `code`: defined_in (1), used_in (4), controllers (4), search_filter (4), imported_in (8), reports (1), services (1)
  - `description`: defined_in (1), validated_in (2), used_in (12), controllers (5), search_filter (5), imported_in (8), reports (1), services (2)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (8), reports (4), services (14)
  - `isActive`: defined_in (1), validated_in (22), used_in (45), controllers (20), search_filter (24), imported_in (8), reports (1), services (6)
  - `references`: defined_in (1), used_in (28), search_filter (2), imported_in (8), reports (1), services (4)
  - `subsidiary_id`: defined_in (1), validated_in (11), used_in (28), controllers (13), search_filter (14), imported_in (8), reports (1), services (8)
  - `taxPercentage`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (8), reports (1), services (1)
  - `type`: defined_in (1), used_in (59), controllers (7), routers (1), search_filter (12), imported_in (8), exported_in (1), reports (2), services (8)
  - `user_id`: defined_in (1), validated_in (25), used_in (53), controllers (24), search_filter (25), imported_in (8), reports (1), services (6)
  - `validate`: defined_in (1), used_in (38), controllers (5), search_filter (7), imported_in (8), reports (1), services (6)

### inventory (`modals/inventory/inventory.ts`)
- Fields: CompanyId, amount, customer_id, godownId, id, inventory_age, isActive, item_id, location, lot_number, qty, rate, stack, uom_id, user_id, warehouseId, work_category_id, work_order
- Usage categories:
  - `CompanyId`: defined_in (1), validated_in (19), used_in (61), controllers (28), routers (1), search_filter (27), imported_in (3), reports (1), services (8)
  - `amount`: defined_in (1), used_in (3), controllers (3), search_filter (3), imported_in (3), reports (1), services (1)
  - `customer_id`: defined_in (1), validated_in (1), used_in (9), controllers (5), search_filter (5), imported_in (3), reports (1), services (1)
  - `godownId`: defined_in (1), validated_in (2), used_in (10), controllers (6), routers (1), search_filter (7), imported_in (3), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (42), imported_in (3), reports (4), services (14)
  - `inventory_age`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (3), reports (1), services (1)
  - `isActive`: defined_in (1), validated_in (22), used_in (45), controllers (20), search_filter (23), imported_in (3), reports (1), services (6)
  - `item_id`: defined_in (1), validated_in (1), used_in (8), controllers (4), search_filter (4), imported_in (3), reports (1), services (1)
  - `location`: defined_in (1), used_in (11), controllers (6), routers (1), search_filter (7), imported_in (3), reports (2), services (2)
  - `lot_number`: defined_in (1), validated_in (1), used_in (5), controllers (4), search_filter (4), imported_in (3), reports (1), services (1)
  - `qty`: defined_in (1), used_in (3), controllers (3), search_filter (3), imported_in (3), reports (1), services (1)
  - `rate`: defined_in (1), validated_in (1), used_in (9), controllers (5), routers (2), search_filter (5), imported_in (3), reports (1), services (1)
  - `stack`: defined_in (1), used_in (18), controllers (8), routers (2), search_filter (9), imported_in (3), reports (3), services (3)
  - `uom_id`: defined_in (1), validated_in (4), used_in (12), controllers (5), search_filter (5), imported_in (3), reports (1), services (4)
  - `user_id`: defined_in (1), validated_in (25), used_in (53), controllers (24), search_filter (24), imported_in (3), reports (1), services (6)
  - `warehouseId`: defined_in (1), validated_in (3), used_in (12), controllers (7), routers (1), search_filter (8), imported_in (3), reports (1), services (1)
  - `work_category_id`: defined_in (1), validated_in (2), used_in (9), controllers (5), search_filter (5), imported_in (3), reports (1), services (2)
  - `work_order`: defined_in (1), used_in (3), controllers (3), search_filter (3), imported_in (3), reports (1), services (1)

### itemGroup (`modals/masters/itemGroup/itemGroup.ts`)
- Fields: CompanyId, base_rate, id, isActive, item_group_code, item_group_name, references, subsidiary_id, user_id
- Usage categories:
  - `CompanyId`: defined_in (1), validated_in (19), used_in (61), controllers (28), routers (1), search_filter (28), imported_in (3), reports (1), services (8)
  - `base_rate`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (3), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (3), reports (4), services (14)
  - `isActive`: defined_in (1), validated_in (22), used_in (45), controllers (20), search_filter (24), imported_in (3), reports (1), services (6)
  - `item_group_code`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (3), reports (1), services (1)
  - `item_group_name`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (3), reports (1), services (1)
  - `references`: defined_in (1), used_in (28), search_filter (2), imported_in (3), reports (1), services (4)
  - `subsidiary_id`: defined_in (1), validated_in (11), used_in (28), controllers (13), search_filter (14), imported_in (3), reports (1), services (8)
  - `user_id`: defined_in (1), validated_in (25), used_in (53), controllers (24), search_filter (25), imported_in (3), reports (1), services (6)

### itemMaster (`modals/masters/items/itemMaster.ts`)
- Fields: CompanyId, barcode, cost_price, default_rate, hsn_sac_code_id, id, isActive, item_category_id, item_code, item_desc, item_group_id, item_name, item_type, min_stock_level, parent_item_id, references, service_type_id, sku, subsidiary_id, track_inventory, uom_id, user_id, work_category_id
- Usage categories:
  - `CompanyId`: defined_in (1), validated_in (19), used_in (61), controllers (28), routers (1), search_filter (28), imported_in (19), reports (1), services (7)
  - `barcode`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (19), reports (1), services (1)
  - `cost_price`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (19), reports (1), services (1)
  - `default_rate`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (19), reports (1), services (1)
  - `hsn_sac_code_id`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (19), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (19), reports (4), services (13)
  - `isActive`: defined_in (1), validated_in (22), used_in (45), controllers (20), search_filter (24), imported_in (19), reports (1), services (5)
  - `item_category_id`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (19), reports (1), services (1)
  - `item_code`: defined_in (1), used_in (9), controllers (9), search_filter (9), imported_in (19), reports (1), services (1)
  - `item_desc`: defined_in (1), used_in (9), controllers (9), search_filter (9), imported_in (19), reports (1), services (1)
  - `item_group_id`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (19), reports (1), services (1)
  - `item_name`: defined_in (1), used_in (10), controllers (9), search_filter (10), imported_in (19), reports (1), services (1)
  - `item_type`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (19), reports (1), services (1)
  - `min_stock_level`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (19), reports (1), services (1)
  - `parent_item_id`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (19), reports (1), services (1)
  - `references`: defined_in (1), used_in (28), search_filter (2), imported_in (19), reports (1), services (3)
  - `service_type_id`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (19), reports (1), services (1)
  - `sku`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (19), reports (1), services (1)
  - `subsidiary_id`: defined_in (1), validated_in (11), used_in (28), controllers (13), search_filter (14), imported_in (19), reports (1), services (7)
  - `track_inventory`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (19), reports (1), services (1)
  - `uom_id`: defined_in (1), validated_in (4), used_in (12), controllers (5), search_filter (6), imported_in (19), reports (1), services (3)
  - `user_id`: defined_in (1), validated_in (25), used_in (53), controllers (24), search_filter (25), imported_in (19), reports (1), services (5)
  - `work_category_id`: defined_in (1), validated_in (1), used_in (9), controllers (5), search_filter (6), imported_in (19), reports (1), services (1)

### panAvailibility (`modals/masters/panAvailibility/panAvailibility.ts`)
- Fields: CompanyId, id, isActive, name, references, user_id
- Usage categories:
  - `CompanyId`: defined_in (1), validated_in (19), used_in (61), controllers (28), routers (1), search_filter (28), imported_in (3), reports (1), services (8)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (3), reports (4), services (14)
  - `isActive`: defined_in (1), validated_in (22), used_in (45), controllers (20), search_filter (24), imported_in (3), reports (1), services (6)
  - `name`: defined_in (1), validated_in (1), used_in (39), controllers (24), routers (3), search_filter (25), imported_in (3), reports (1), services (7)
  - `references`: defined_in (1), used_in (28), search_filter (2), imported_in (3), reports (1), services (4)
  - `user_id`: defined_in (1), validated_in (25), used_in (53), controllers (24), search_filter (25), imported_in (3), reports (1), services (6)

### paymentMethod (`modals/masters/paymentMethod/paymentMethod.ts`)
- Fields: CompanyId, id, isActive, name, references, user_id
- Usage categories:
  - `CompanyId`: defined_in (1), validated_in (19), used_in (61), controllers (28), routers (1), search_filter (28), imported_in (2), reports (1), services (8)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (2), reports (4), services (14)
  - `isActive`: defined_in (1), validated_in (22), used_in (45), controllers (20), search_filter (24), imported_in (2), reports (1), services (6)
  - `name`: defined_in (1), validated_in (1), used_in (39), controllers (24), routers (3), search_filter (25), imported_in (2), reports (1), services (7)
  - `references`: defined_in (1), used_in (28), search_filter (2), imported_in (2), reports (1), services (4)
  - `user_id`: defined_in (1), validated_in (25), used_in (53), controllers (24), search_filter (25), imported_in (2), reports (1), services (6)

### permission (`modals/permission/permission.ts`)
- Fields: action, createdAt, description, id, module, name, updatedAt
- Usage categories:
  - `action`: defined_in (1), used_in (7), controllers (3), search_filter (4), imported_in (6), exported_in (1), reports (1), services (1)
  - `createdAt`: defined_in (1), validated_in (3), used_in (68), controllers (20), search_filter (23), imported_in (6), reports (1), services (6)
  - `description`: defined_in (1), validated_in (3), used_in (12), controllers (5), search_filter (5), imported_in (6), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (6), reports (3), services (13)
  - `module`: defined_in (1), used_in (3), controllers (2), search_filter (3), imported_in (6), exported_in (1), reports (1), services (1)
  - `name`: defined_in (1), validated_in (2), used_in (39), controllers (24), routers (3), search_filter (25), imported_in (6), reports (1), services (6)
  - `updatedAt`: defined_in (1), validated_in (3), used_in (54), controllers (7), search_filter (10), imported_in (6), reports (1), services (5)

### purchaseInvoiceHeader (`modals/Transactions/purchase/purchaseInvoice/purchaseInvoiceHeader.ts`)
- Fields: balanceAmount, companyId, currency, discountAmount, dueDate, exchangeRate, freightAmount, grnHeaderId, id, invoiceDate, invoiceNumber, invoiceType, otherCharges, paidAmount, poHeaderId, remarks, status, subtotal, taxAmount, totalAmount, user_id, vendorId, vendorInvoiceNumber
- Usage categories:
  - `balanceAmount`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (2), reports (1), services (1)
  - `companyId`: defined_in (1), validated_in (2), used_in (14), controllers (7), search_filter (7), imported_in (2), reports (1), services (1)
  - `currency`: defined_in (1), used_in (10), controllers (3), search_filter (3), imported_in (2), reports (2), services (4)
  - `discountAmount`: defined_in (1), validated_in (2), used_in (5), controllers (2), search_filter (2), imported_in (2), reports (1), services (1)
  - `dueDate`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (2), reports (1), services (1)
  - `exchangeRate`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (2), reports (1), services (1)
  - `freightAmount`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (2), reports (1), services (1)
  - `grnHeaderId`: defined_in (1), validated_in (3), used_in (7), controllers (4), search_filter (4), imported_in (2), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (2), reports (4), services (14)
  - `invoiceDate`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (2), reports (1), services (1)
  - `invoiceNumber`: defined_in (1), used_in (2), controllers (2), search_filter (2), imported_in (2), reports (1), services (1)
  - `invoiceType`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (2), reports (1), services (1)
  - `otherCharges`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (2), reports (1), services (1)
  - `paidAmount`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (2), reports (1), services (1)
  - `poHeaderId`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (2), reports (1), services (1)
  - `remarks`: defined_in (1), validated_in (12), used_in (23), controllers (8), search_filter (8), imported_in (2), reports (1), services (1)
  - `status`: defined_in (1), validated_in (8), used_in (62), controllers (36), routers (9), search_filter (39), approval_workflow (62), imported_in (2), reports (3), services (5)
  - `subtotal`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (2), reports (1), services (1)
  - `taxAmount`: defined_in (1), validated_in (2), used_in (6), controllers (3), search_filter (3), imported_in (2), reports (1), services (1)
  - `totalAmount`: defined_in (1), validated_in (1), used_in (4), controllers (3), search_filter (3), imported_in (2), reports (1), services (1)
  - `user_id`: defined_in (1), validated_in (25), used_in (53), controllers (24), search_filter (25), imported_in (2), reports (1), services (6)
  - `vendorId`: defined_in (1), validated_in (2), used_in (4), controllers (2), search_filter (2), imported_in (2), reports (1), services (1)
  - `vendorInvoiceNumber`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (2), reports (1), services (1)

### purchaseInvoiceLine (`modals/Transactions/purchase/purchaseInvoice/purchaseInvoiceLine.ts`)
- Fields: CompanyId, batchNo, description, discountAmount, discountPercent, grnLineId, id, invoiceHeaderId, itemId, lineTotal, poLineId, quantity, remarks, taxAmount, taxPercent, unitPrice, user_id
- Usage categories:
  - `CompanyId`: defined_in (1), validated_in (19), used_in (61), controllers (28), routers (1), search_filter (28), imported_in (1), reports (1), services (8)
  - `batchNo`: defined_in (1), validated_in (4), used_in (11), controllers (6), search_filter (6), imported_in (1), reports (1), services (1)
  - `description`: defined_in (1), validated_in (2), used_in (12), controllers (5), search_filter (5), imported_in (1), reports (1), services (2)
  - `discountAmount`: defined_in (1), validated_in (2), used_in (5), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `discountPercent`: defined_in (1), used_in (3), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `grnLineId`: defined_in (1), validated_in (2), used_in (5), controllers (3), search_filter (3), imported_in (1), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (1), reports (4), services (14)
  - `invoiceHeaderId`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `itemId`: defined_in (1), validated_in (4), used_in (14), controllers (7), routers (1), search_filter (8), imported_in (1), reports (2), services (1)
  - `lineTotal`: defined_in (1), validated_in (1), used_in (8), controllers (5), search_filter (5), imported_in (1), reports (1), services (1)
  - `poLineId`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `quantity`: defined_in (1), validated_in (1), used_in (10), controllers (7), routers (1), search_filter (9), imported_in (1), reports (1), services (1)
  - `remarks`: defined_in (1), validated_in (12), used_in (23), controllers (8), search_filter (8), imported_in (1), reports (1), services (1)
  - `taxAmount`: defined_in (1), validated_in (2), used_in (6), controllers (3), search_filter (3), imported_in (1), reports (1), services (1)
  - `taxPercent`: defined_in (1), used_in (3), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `unitPrice`: defined_in (1), validated_in (2), used_in (9), controllers (5), search_filter (5), imported_in (1), reports (1), services (1)
  - `user_id`: defined_in (1), validated_in (25), used_in (53), controllers (24), search_filter (25), imported_in (1), reports (1), services (6)

### purchaseOrderHeader (`modals/Transactions/purchase/purchaseOrder/purchaseOrderHeader.ts`)
- Fields: CompanyId, city_id, customer_id, deliveryDate, driverName, driverPhone, godown_id, id, purchaseDate, purchaseNo, references, remarks, shipped_from, shipped_to, stack_id, status, subsidiary_id, transportation_mode_id, transporterName, user_id, vehicleNumber, vendor_id, warehouse_id, work_order_no
- Usage categories:
  - `CompanyId`: defined_in (1), validated_in (19), used_in (61), controllers (28), routers (1), search_filter (28), imported_in (7), reports (1), services (8)
  - `city_id`: defined_in (1), validated_in (2), used_in (10), controllers (4), search_filter (6), imported_in (7), reports (1), services (1)
  - `customer_id`: defined_in (1), validated_in (1), used_in (9), controllers (5), search_filter (6), imported_in (7), reports (1), services (1)
  - `deliveryDate`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (7), reports (1), services (1)
  - `driverName`: defined_in (1), validated_in (2), used_in (5), controllers (3), search_filter (3), imported_in (7), reports (1), services (1)
  - `driverPhone`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (7), reports (1), services (1)
  - `godown_id`: defined_in (1), used_in (4), controllers (2), search_filter (3), imported_in (7), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (7), reports (4), services (14)
  - `purchaseDate`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (7), reports (1), services (1)
  - `purchaseNo`: defined_in (1), used_in (5), controllers (5), search_filter (5), imported_in (7), reports (1), services (1)
  - `references`: defined_in (1), used_in (28), search_filter (2), imported_in (7), reports (1), services (4)
  - `remarks`: defined_in (1), validated_in (12), used_in (23), controllers (8), search_filter (8), imported_in (7), reports (1), services (1)
  - `shipped_from`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (7), reports (1), services (1)
  - `shipped_to`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (7), reports (1), services (1)
  - `stack_id`: defined_in (1), used_in (4), controllers (2), search_filter (3), imported_in (7), reports (1), services (1)
  - `status`: defined_in (1), validated_in (8), used_in (62), controllers (36), routers (9), search_filter (39), approval_workflow (62), imported_in (7), reports (3), services (5)
  - `subsidiary_id`: defined_in (1), validated_in (11), used_in (28), controllers (13), search_filter (14), imported_in (7), reports (1), services (8)
  - `transportation_mode_id`: defined_in (1), used_in (4), controllers (1), search_filter (1), imported_in (7), reports (1), services (1)
  - `transporterName`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (7), reports (1), services (1)
  - `user_id`: defined_in (1), validated_in (25), used_in (53), controllers (24), search_filter (25), imported_in (7), reports (1), services (6)
  - `vehicleNumber`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (7), reports (1), services (1)
  - `vendor_id`: defined_in (1), used_in (2), controllers (1), search_filter (1), imported_in (7), reports (1), services (1)
  - `warehouse_id`: defined_in (1), used_in (7), controllers (1), search_filter (2), imported_in (7), reports (1), services (1)
  - `work_order_no`: defined_in (1), validated_in (1), used_in (2), controllers (1), search_filter (1), imported_in (7), reports (1), services (1)

### purchaseOrderLine (`modals/Transactions/purchase/purchaseOrder/purchaseOrderLine.ts`)
- Fields: CompanyId, hsn_sac_id, id, isActive, item_id, line_total, lot_number, purchase_order_header_id, quantity, rate, remarks, status, tax_amount, tax_rate, uom_id, use_rate_calculation, user_id, work_category_id, work_order_no
- Usage categories:
  - `CompanyId`: defined_in (1), validated_in (19), used_in (61), controllers (28), routers (1), search_filter (28), imported_in (1), reports (1), services (8)
  - `hsn_sac_id`: defined_in (1), used_in (3), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (1), reports (4), services (14)
  - `isActive`: defined_in (1), validated_in (22), used_in (45), controllers (20), search_filter (24), imported_in (1), reports (1), services (6)
  - `item_id`: defined_in (1), validated_in (1), used_in (8), controllers (4), search_filter (5), imported_in (1), reports (1), services (1)
  - `line_total`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `lot_number`: defined_in (1), validated_in (1), used_in (5), controllers (4), search_filter (5), imported_in (1), reports (1), services (1)
  - `purchase_order_header_id`: defined_in (1), validated_in (1), used_in (2), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `quantity`: defined_in (1), validated_in (1), used_in (10), controllers (7), routers (1), search_filter (9), imported_in (1), reports (1), services (1)
  - `rate`: defined_in (1), validated_in (1), used_in (9), controllers (5), routers (2), search_filter (6), imported_in (1), reports (1), services (1)
  - `remarks`: defined_in (1), validated_in (12), used_in (23), controllers (8), search_filter (8), imported_in (1), reports (1), services (1)
  - `status`: defined_in (1), validated_in (8), used_in (62), controllers (36), routers (9), search_filter (39), approval_workflow (62), imported_in (1), reports (3), services (5)
  - `tax_amount`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `tax_rate`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `uom_id`: defined_in (1), validated_in (4), used_in (12), controllers (5), search_filter (6), imported_in (1), reports (1), services (4)
  - `use_rate_calculation`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `user_id`: defined_in (1), validated_in (25), used_in (53), controllers (24), search_filter (25), imported_in (1), reports (1), services (6)
  - `work_category_id`: defined_in (1), validated_in (1), used_in (9), controllers (5), search_filter (6), imported_in (1), reports (1), services (2)
  - `work_order_no`: defined_in (1), validated_in (1), used_in (2), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)

### purchaseReturnHeader (`modals/Transactions/purchase/purchaseReturn/purchaseReturnHeader.ts`)
- Fields: companyId, grnHeaderId, id, purchaseInvoiceHeaderId, purchaseOrderHeaderId, reason, remarks, returnDate, returnNumber, status, user_id, vendorId
- Usage categories:
  - `companyId`: defined_in (1), validated_in (2), used_in (14), controllers (7), search_filter (7), imported_in (1), reports (1), services (1)
  - `grnHeaderId`: defined_in (1), validated_in (2), used_in (7), controllers (4), search_filter (4), imported_in (1), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (1), reports (4), services (14)
  - `purchaseInvoiceHeaderId`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `purchaseOrderHeaderId`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `reason`: defined_in (1), validated_in (1), used_in (4), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `remarks`: defined_in (1), validated_in (12), used_in (23), controllers (8), search_filter (8), imported_in (1), reports (1), services (1)
  - `returnDate`: defined_in (1), used_in (3), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `returnNumber`: defined_in (1), used_in (3), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `status`: defined_in (1), validated_in (8), used_in (62), controllers (36), routers (9), search_filter (39), approval_workflow (62), imported_in (1), reports (3), services (5)
  - `user_id`: defined_in (1), validated_in (25), used_in (53), controllers (24), search_filter (25), imported_in (1), reports (1), services (6)
  - `vendorId`: defined_in (1), validated_in (1), used_in (4), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)

### purchaseReturnLine (`modals/Transactions/purchase/purchaseReturn/purchaseReturnLine.ts`)
- Fields: batchNo, damagedQty, grnLineId, id, itemId, reason, rejectedQty, remarks, returnHeaderId, returnQty, unitPrice
- Usage categories:
  - `batchNo`: defined_in (1), validated_in (4), used_in (11), controllers (6), search_filter (6), imported_in (1), reports (1), services (1)
  - `damagedQty`: defined_in (1), validated_in (1), used_in (5), controllers (3), search_filter (3), imported_in (1), reports (1), services (1)
  - `grnLineId`: defined_in (1), validated_in (2), used_in (5), controllers (3), search_filter (3), imported_in (1), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (1), reports (4), services (14)
  - `itemId`: defined_in (1), validated_in (4), used_in (14), controllers (7), routers (1), search_filter (8), imported_in (1), reports (2), services (1)
  - `reason`: defined_in (1), validated_in (1), used_in (4), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `rejectedQty`: defined_in (1), validated_in (2), used_in (7), controllers (4), search_filter (4), imported_in (1), reports (1), services (1)
  - `remarks`: defined_in (1), validated_in (12), used_in (23), controllers (8), search_filter (8), imported_in (1), reports (1), services (1)
  - `returnHeaderId`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `returnQty`: defined_in (1), used_in (3), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `unitPrice`: defined_in (1), validated_in (2), used_in (9), controllers (5), search_filter (5), imported_in (1), reports (1), services (1)

### qualityReportHeader (`modals/Transactions/purchase/qualityReport/qualityReportHeader.ts`)
- Fields: approvedBy, companyId, grnHeaderId, id, inspectedBy, inspectionDate, overallStatus, poHeaderId, qcNumber, remarks, user_id, vendorId
- Usage categories:
  - `approvedBy`: defined_in (1), used_in (3), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `companyId`: defined_in (1), validated_in (2), used_in (14), controllers (7), search_filter (7), imported_in (1), reports (1), services (1)
  - `grnHeaderId`: defined_in (1), validated_in (2), used_in (7), controllers (4), search_filter (4), imported_in (1), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (1), reports (4), services (14)
  - `inspectedBy`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `inspectionDate`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `overallStatus`: defined_in (1), used_in (1), controllers (1), search_filter (1), approval_workflow (1), imported_in (1), reports (1), services (1)
  - `poHeaderId`: defined_in (1), used_in (3), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `qcNumber`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `remarks`: defined_in (1), validated_in (12), used_in (23), controllers (8), search_filter (8), imported_in (1), reports (1), services (1)
  - `user_id`: defined_in (1), validated_in (25), used_in (53), controllers (24), search_filter (25), imported_in (1), reports (1), services (6)
  - `vendorId`: defined_in (1), validated_in (1), used_in (4), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)

### qualityReportLine (`modals/Transactions/purchase/qualityReport/qualityReportLine.ts`)
- Fields: acceptedQty, batchNo, damagedQty, grnLineId, holdQty, id, inspectedQty, itemId, qcHeaderId, qcStatus, receivedQty, rejectedQty, rejectionReason, remarks
- Usage categories:
  - `acceptedQty`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `batchNo`: defined_in (1), validated_in (4), used_in (11), controllers (6), search_filter (6), imported_in (1), reports (1), services (1)
  - `damagedQty`: defined_in (1), validated_in (1), used_in (5), controllers (3), search_filter (3), imported_in (1), reports (1), services (1)
  - `grnLineId`: defined_in (1), validated_in (2), used_in (5), controllers (3), search_filter (3), imported_in (1), reports (1), services (1)
  - `holdQty`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (1), reports (4), services (14)
  - `inspectedQty`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `itemId`: defined_in (1), validated_in (4), used_in (14), controllers (7), routers (1), search_filter (8), imported_in (1), reports (2), services (1)
  - `qcHeaderId`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `qcStatus`: defined_in (1), used_in (1), controllers (1), search_filter (1), approval_workflow (1), imported_in (1), reports (1), services (1)
  - `receivedQty`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `rejectedQty`: defined_in (1), validated_in (2), used_in (7), controllers (4), search_filter (4), imported_in (1), reports (1), services (1)
  - `rejectionReason`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `remarks`: defined_in (1), validated_in (12), used_in (23), controllers (8), search_filter (8), imported_in (1), reports (1), services (1)

### registrationType (`modals/masters/registrationType/registrationType.ts`)
- Fields: CompanyId, id, isActive, references, registration_type, user_id
- Usage categories:
  - `CompanyId`: defined_in (1), validated_in (19), used_in (61), controllers (28), routers (1), search_filter (28), imported_in (4), reports (1), services (8)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (4), reports (4), services (14)
  - `isActive`: defined_in (1), validated_in (22), used_in (45), controllers (20), search_filter (24), imported_in (4), reports (1), services (6)
  - `references`: defined_in (1), used_in (28), search_filter (2), imported_in (4), reports (1), services (4)
  - `registration_type`: defined_in (1), used_in (3), controllers (1), search_filter (2), imported_in (4), reports (1), services (1)
  - `user_id`: defined_in (1), validated_in (25), used_in (53), controllers (24), search_filter (25), imported_in (4), reports (1), services (6)

### salesOrderHeader (`modals/Transactions/sales/salesOrder/salesOrderHeader.ts`)
- Fields: billingAddress, cityId, companyId, customerId, customerPO, discountAmount, expectedDeliveryDate, godownId, id, orderDate, orderNumber, referenceNumber, remarks, shippingAddress, shippingAmount, stackId, status, subsidiaryId, subtotal, taxAmount, totalAmount, transportationModeId, uomId, user_id, warehouseId
- Usage categories:
  - `billingAddress`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `cityId`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `companyId`: defined_in (1), validated_in (3), used_in (14), controllers (7), search_filter (7), imported_in (1), reports (1), services (1)
  - `customerId`: defined_in (1), validated_in (1), used_in (6), controllers (4), search_filter (4), imported_in (1), reports (1), services (1)
  - `customerPO`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `discountAmount`: defined_in (1), validated_in (2), used_in (5), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `expectedDeliveryDate`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `godownId`: defined_in (1), validated_in (2), used_in (10), controllers (6), routers (1), search_filter (8), imported_in (1), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (1), reports (4), services (14)
  - `orderDate`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `orderNumber`: defined_in (1), used_in (2), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `referenceNumber`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `remarks`: defined_in (1), validated_in (12), used_in (23), controllers (8), search_filter (8), imported_in (1), reports (1), services (1)
  - `shippingAddress`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `shippingAmount`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `stackId`: defined_in (1), validated_in (1), used_in (5), controllers (3), search_filter (4), imported_in (1), reports (1), services (1)
  - `status`: defined_in (1), validated_in (8), used_in (62), controllers (36), routers (9), search_filter (39), approval_workflow (62), imported_in (1), reports (3), services (5)
  - `subsidiaryId`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `subtotal`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `taxAmount`: defined_in (1), validated_in (2), used_in (6), controllers (3), search_filter (3), imported_in (1), reports (1), services (1)
  - `totalAmount`: defined_in (1), validated_in (1), used_in (4), controllers (3), search_filter (3), imported_in (1), reports (1), services (1)
  - `transportationModeId`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `uomId`: defined_in (1), used_in (2), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `user_id`: defined_in (1), validated_in (25), used_in (53), controllers (24), search_filter (25), imported_in (1), reports (1), services (6)
  - `warehouseId`: defined_in (1), validated_in (3), used_in (12), controllers (7), routers (1), search_filter (9), imported_in (1), reports (1), services (1)

### salesOrderLine (`modals/Transactions/sales/salesOrder/salesOrderLine.ts`)
- Fields: discountAmount, discountPercent, dispatchedQty, id, itemId, lineTotal, orderedQty, pendingQty, remarks, salesOrderHeaderId, taxAmount, taxPercent, unitPrice
- Usage categories:
  - `discountAmount`: defined_in (1), validated_in (3), used_in (5), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `discountPercent`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `dispatchedQty`: defined_in (1), used_in (2), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (1), reports (4), services (14)
  - `itemId`: defined_in (1), validated_in (5), used_in (14), controllers (7), routers (1), search_filter (8), imported_in (1), reports (2), services (1)
  - `lineTotal`: defined_in (1), validated_in (2), used_in (8), controllers (5), search_filter (5), imported_in (1), reports (1), services (1)
  - `orderedQty`: defined_in (1), validated_in (1), used_in (4), controllers (3), search_filter (3), imported_in (1), reports (1), services (1)
  - `pendingQty`: defined_in (1), used_in (2), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `remarks`: defined_in (1), validated_in (13), used_in (23), controllers (8), search_filter (8), imported_in (1), reports (1), services (1)
  - `salesOrderHeaderId`: defined_in (1), validated_in (1), used_in (5), controllers (3), search_filter (3), imported_in (1), reports (1), services (1)
  - `taxAmount`: defined_in (1), validated_in (3), used_in (6), controllers (3), search_filter (3), imported_in (1), reports (1), services (1)
  - `taxPercent`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `unitPrice`: defined_in (1), validated_in (3), used_in (9), controllers (5), search_filter (5), imported_in (1), reports (1), services (1)

### salesReturnHeader (`modals/Transactions/sales/salesReturn/salesReturnHeader.ts`)
- Fields: approvedBy, companyId, customerId, deliveryChallanHeaderId, id, receivedBy, remarks, returnDate, returnNumber, returnReason, salesOrderHeaderId, status, user_id
- Usage categories:
  - `approvedBy`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (2), reports (1), services (1)
  - `companyId`: defined_in (1), validated_in (3), used_in (14), controllers (7), search_filter (7), imported_in (2), reports (1), services (1)
  - `customerId`: defined_in (1), validated_in (2), used_in (6), controllers (4), search_filter (4), imported_in (2), reports (1), services (1)
  - `deliveryChallanHeaderId`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (2), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (2), reports (4), services (14)
  - `receivedBy`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (2), reports (1), services (1)
  - `remarks`: defined_in (1), validated_in (13), used_in (23), controllers (8), search_filter (8), imported_in (2), reports (1), services (1)
  - `returnDate`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (2), reports (1), services (1)
  - `returnNumber`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (2), reports (1), services (1)
  - `returnReason`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (2), reports (1), services (1)
  - `salesOrderHeaderId`: defined_in (1), validated_in (1), used_in (5), controllers (3), search_filter (3), imported_in (2), reports (1), services (1)
  - `status`: defined_in (1), validated_in (9), used_in (62), controllers (36), routers (9), search_filter (39), approval_workflow (62), imported_in (2), reports (3), services (5)
  - `user_id`: defined_in (1), validated_in (26), used_in (53), controllers (24), search_filter (25), imported_in (2), reports (1), services (6)

### salesReturnLine (`modals/Transactions/sales/salesReturn/salesReturnLine.ts`)
- Fields: approvedQty, batchNo, damagedQty, deliveryChallanLineId, id, itemId, lineTotal, reason, rejectedQty, remarks, returnQty, salesOrderLineId, salesReturnHeaderId, status, unitPrice
- Usage categories:
  - `approvedQty`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `batchNo`: defined_in (1), validated_in (5), used_in (11), controllers (6), search_filter (6), imported_in (1), reports (1), services (1)
  - `damagedQty`: defined_in (1), validated_in (2), used_in (5), controllers (3), search_filter (3), imported_in (1), reports (1), services (1)
  - `deliveryChallanLineId`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (1), reports (4), services (14)
  - `itemId`: defined_in (1), validated_in (5), used_in (14), controllers (7), routers (1), search_filter (8), imported_in (1), reports (2), services (1)
  - `lineTotal`: defined_in (1), validated_in (2), used_in (8), controllers (5), search_filter (5), imported_in (1), reports (1), services (1)
  - `reason`: defined_in (1), validated_in (2), used_in (4), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `rejectedQty`: defined_in (1), validated_in (3), used_in (7), controllers (4), search_filter (4), imported_in (1), reports (1), services (1)
  - `remarks`: defined_in (1), validated_in (13), used_in (23), controllers (8), search_filter (8), imported_in (1), reports (1), services (1)
  - `returnQty`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `salesOrderLineId`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (1), reports (1), services (1)
  - `salesReturnHeaderId`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (1), reports (1), services (1)
  - `status`: defined_in (1), validated_in (9), used_in (62), controllers (36), routers (9), search_filter (39), approval_workflow (62), imported_in (1), reports (3), services (5)
  - `unitPrice`: defined_in (1), validated_in (3), used_in (9), controllers (5), search_filter (5), imported_in (1), reports (1), services (1)

### serviceCatMaster (`modals/masters/serviceCategory/serviceCatMaster.ts`)
- Fields: CompanyId, category_name, id, isActive, references, subsidiary_id, user_id
- Usage categories:
  - `CompanyId`: defined_in (1), validated_in (19), used_in (61), controllers (28), routers (1), search_filter (28), imported_in (4), reports (1), services (7)
  - `category_name`: defined_in (1), used_in (2), controllers (2), search_filter (2), imported_in (4), reports (1), services (2)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (4), reports (4), services (13)
  - `isActive`: defined_in (1), validated_in (22), used_in (45), controllers (20), search_filter (24), imported_in (4), reports (1), services (5)
  - `references`: defined_in (1), used_in (28), search_filter (2), imported_in (4), reports (1), services (3)
  - `subsidiary_id`: defined_in (1), validated_in (11), used_in (28), controllers (13), search_filter (14), imported_in (4), reports (1), services (7)
  - `user_id`: defined_in (1), validated_in (25), used_in (53), controllers (24), search_filter (25), imported_in (4), reports (1), services (5)

### serviceTypeMaster (`modals/masters/serviceType/serviceTypeMaster.ts`)
- Fields: CompanyId, id, isActive, references, service_category_id, service_name, subsidiary_id, uom_id, user_id
- Usage categories:
  - `CompanyId`: defined_in (1), validated_in (19), used_in (61), controllers (28), routers (1), search_filter (28), imported_in (4), reports (1), services (7)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (4), reports (4), services (13)
  - `isActive`: defined_in (1), validated_in (22), used_in (45), controllers (20), search_filter (24), imported_in (4), reports (1), services (5)
  - `references`: defined_in (1), used_in (28), search_filter (2), imported_in (4), reports (1), services (3)
  - `service_category_id`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (4), reports (1), services (1)
  - `service_name`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (4), reports (1), services (1)
  - `subsidiary_id`: defined_in (1), validated_in (11), used_in (28), controllers (13), search_filter (14), imported_in (4), reports (1), services (7)
  - `uom_id`: defined_in (1), validated_in (4), used_in (12), controllers (5), search_filter (6), imported_in (4), reports (1), services (3)
  - `user_id`: defined_in (1), validated_in (25), used_in (53), controllers (24), search_filter (25), imported_in (4), reports (1), services (5)

### stack (`modals/masters/stack/stack.ts`)
- Fields: GodownId, availableCapacity, availableVolume, breadth, capacity, capacityUnit, height, id, length, name, position, references, sizeUnit
- Usage categories:
  - `GodownId`: defined_in (1), used_in (5), controllers (3), routers (1), search_filter (4), imported_in (10), reports (1), services (1)
  - `availableCapacity`: defined_in (1), used_in (3), controllers (2), search_filter (2), imported_in (10), reports (1), services (1)
  - `availableVolume`: defined_in (1), used_in (3), controllers (2), search_filter (2), imported_in (10), reports (1), services (1)
  - `breadth`: defined_in (1), used_in (3), controllers (2), search_filter (2), imported_in (10), reports (1), services (1)
  - `capacity`: defined_in (1), used_in (3), controllers (2), search_filter (2), imported_in (10), reports (1), services (1)
  - `capacityUnit`: defined_in (1), used_in (3), controllers (2), search_filter (2), imported_in (10), reports (1), services (1)
  - `height`: defined_in (1), used_in (3), controllers (2), search_filter (2), imported_in (10), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (10), reports (4), services (14)
  - `length`: defined_in (1), validated_in (1), used_in (25), controllers (19), search_filter (21), imported_in (10), reports (1), services (1)
  - `name`: defined_in (1), validated_in (2), used_in (39), controllers (24), routers (3), search_filter (25), imported_in (10), reports (1), services (7)
  - `position`: defined_in (1), used_in (2), controllers (2), search_filter (2), imported_in (10), reports (1), services (1)
  - `references`: defined_in (1), used_in (28), search_filter (2), imported_in (10), reports (1), services (4)
  - `sizeUnit`: defined_in (1), used_in (3), controllers (2), search_filter (2), imported_in (10), reports (1), services (1)

### state (`modals/masters/state/state.ts`)
- Fields: id, state_code, state_name
- Usage categories:
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (6), reports (4), services (14)
  - `state_code`: defined_in (1), used_in (3), controllers (3), search_filter (3), imported_in (6), reports (1), services (1)
  - `state_name`: defined_in (1), used_in (2), controllers (2), search_filter (2), imported_in (6), reports (1), services (1)

### subsdiaryMaster (`modals/masters/subsidiaries/subsdiaryMaster.ts`)
- Fields: CompanyId, currency_id, id, isActive, parent_subsidiary_id, references, subsidiary_name, user_id
- Usage categories:
  - `CompanyId`: defined_in (1), validated_in (19), used_in (61), controllers (28), routers (1), search_filter (28), imported_in (31), reports (1), services (8)
  - `currency_id`: defined_in (1), validated_in (1), used_in (4), controllers (2), search_filter (3), imported_in (31), reports (1), services (2)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (31), reports (4), services (14)
  - `isActive`: defined_in (1), validated_in (22), used_in (45), controllers (20), search_filter (24), imported_in (31), reports (1), services (6)
  - `parent_subsidiary_id`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (31), reports (1), services (1)
  - `references`: defined_in (1), used_in (28), search_filter (2), imported_in (31), reports (1), services (4)
  - `subsidiary_name`: defined_in (1), used_in (10), controllers (10), search_filter (10), imported_in (31), reports (1), services (3)
  - `user_id`: defined_in (1), validated_in (25), used_in (53), controllers (24), search_filter (25), imported_in (31), reports (1), services (6)

### systemLogs (`modals/systemLogs/systemLogs.ts`)
- Fields: action_type, additional_data, changed_fields, company_id, description, endpoint, error_message, execution_time, id, ip_address, isActive, model_name, performed_by_name, record_id, request_method, status, user_agent, user_role
- Usage categories:
  - `action_type`: defined_in (1), used_in (3), controllers (1), search_filter (1), imported_in (5), reports (1), services (1)
  - `additional_data`: defined_in (1), used_in (1), imported_in (5), reports (1), services (1)
  - `changed_fields`: defined_in (1), used_in (2), imported_in (5), reports (1), services (1)
  - `company_id`: defined_in (1), validated_in (4), used_in (10), controllers (4), search_filter (5), imported_in (5), reports (1), services (1)
  - `description`: defined_in (1), validated_in (2), used_in (12), controllers (5), search_filter (5), imported_in (5), reports (1), services (2)
  - `endpoint`: defined_in (1), used_in (3), controllers (1), search_filter (1), imported_in (5), reports (1), services (1)
  - `error_message`: defined_in (1), used_in (2), imported_in (5), reports (1), services (1)
  - `execution_time`: defined_in (1), used_in (2), imported_in (5), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (5), reports (4), services (14)
  - `ip_address`: defined_in (1), used_in (2), imported_in (5), reports (1), services (1)
  - `isActive`: defined_in (1), validated_in (22), used_in (45), controllers (20), search_filter (24), imported_in (5), reports (1), services (6)
  - `model_name`: defined_in (1), used_in (3), controllers (1), search_filter (1), imported_in (5), reports (1), services (1)
  - `performed_by_name`: defined_in (1), used_in (3), controllers (1), search_filter (1), imported_in (5), reports (1), services (1)
  - `record_id`: defined_in (1), used_in (3), controllers (1), search_filter (1), imported_in (5), reports (1), services (1)
  - `request_method`: defined_in (1), used_in (2), imported_in (5), reports (1), services (1)
  - `status`: defined_in (1), validated_in (8), used_in (62), controllers (36), routers (9), search_filter (39), approval_workflow (62), imported_in (5), reports (3), services (5)
  - `user_agent`: defined_in (1), used_in (2), imported_in (5), reports (1), services (1)
  - `user_role`: defined_in (1), used_in (2), imported_in (5), reports (1), services (1)

### token (`modals/token/token.ts`)
- Fields: createdAt, expireAt, id, references, token, userId
- Usage categories:
  - `createdAt`: defined_in (1), validated_in (3), used_in (68), controllers (20), search_filter (23), imported_in (4), reports (2), services (7)
  - `expireAt`: defined_in (1), imported_in (4), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (4), reports (4), services (14)
  - `references`: defined_in (1), used_in (28), search_filter (2), imported_in (4), reports (1), services (4)
  - `token`: defined_in (1), used_in (9), controllers (1), routers (1), search_filter (2), imported_in (4), reports (1), services (2)
  - `userId`: defined_in (1), used_in (31), controllers (23), routers (1), search_filter (28), imported_in (4), reports (1), services (4)

### transportMode (`modals/masters/transportMode/transportMode.ts`)
- Fields: company_id, id, isActive, mode_name, references, subsidiary_id, user_id
- Usage categories:
  - `company_id`: defined_in (1), validated_in (4), used_in (10), controllers (4), search_filter (5), imported_in (8), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (8), reports (4), services (14)
  - `isActive`: defined_in (1), validated_in (22), used_in (45), controllers (20), search_filter (24), imported_in (8), reports (1), services (6)
  - `mode_name`: defined_in (1), used_in (2), controllers (2), search_filter (2), imported_in (8), reports (1), services (1)
  - `references`: defined_in (1), used_in (28), search_filter (2), imported_in (8), reports (1), services (4)
  - `subsidiary_id`: defined_in (1), validated_in (11), used_in (28), controllers (13), search_filter (14), imported_in (8), reports (1), services (8)
  - `user_id`: defined_in (1), validated_in (25), used_in (53), controllers (24), search_filter (25), imported_in (8), reports (1), services (6)

### UOMMaster (`modals/masters/UOM/UOMMaster.ts`)
- Fields: CompanyId, id, isActive, references, subsidiary_id, uom_name, user_id
- Usage categories:
  - `CompanyId`: defined_in (1), validated_in (19), used_in (61), controllers (28), routers (1), search_filter (28), imported_in (12), reports (1), services (8)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (12), reports (4), services (14)
  - `isActive`: defined_in (1), validated_in (22), used_in (45), controllers (20), search_filter (24), imported_in (12), reports (1), services (6)
  - `references`: defined_in (1), used_in (28), search_filter (2), imported_in (12), reports (1), services (4)
  - `subsidiary_id`: defined_in (1), validated_in (11), used_in (28), controllers (13), search_filter (14), imported_in (12), reports (1), services (8)
  - `uom_name`: defined_in (1), used_in (5), controllers (4), search_filter (5), imported_in (12), reports (1), services (1)
  - `user_id`: defined_in (1), validated_in (25), used_in (53), controllers (24), search_filter (25), imported_in (12), reports (1), services (6)

### user (`modals/user/user.ts`)
- Fields: Email, FirstName, LastName, Password, Phone, ProfileImage, Type, company_id, created_by, id, isActive, references
- Usage categories:
  - `Email`: defined_in (1), used_in (4), controllers (4), search_filter (4), imported_in (43), reports (1), services (1)
  - `FirstName`: defined_in (1), used_in (6), controllers (4), search_filter (4), imported_in (43), reports (1), services (1)
  - `LastName`: defined_in (1), used_in (6), controllers (4), search_filter (4), imported_in (43), reports (1), services (1)
  - `Password`: defined_in (1), used_in (4), controllers (4), search_filter (4), imported_in (43), reports (1), services (1)
  - `Phone`: defined_in (1), used_in (5), controllers (4), search_filter (5), imported_in (43), reports (1), services (1)
  - `ProfileImage`: defined_in (1), used_in (1), routers (1), imported_in (43), reports (1), services (1)
  - `Type`: defined_in (1), used_in (11), controllers (8), search_filter (9), imported_in (43), reports (1), services (1)
  - `company_id`: defined_in (1), validated_in (4), used_in (10), controllers (4), search_filter (5), imported_in (43), reports (1), services (1)
  - `created_by`: defined_in (1), used_in (6), controllers (4), search_filter (5), imported_in (43), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (43), reports (4), services (14)
  - `isActive`: defined_in (1), validated_in (22), used_in (45), controllers (20), search_filter (24), imported_in (43), reports (1), services (6)
  - `references`: defined_in (1), used_in (28), search_filter (2), imported_in (43), reports (1), services (4)

### userPermission (`modals/userPermission/userPermission.ts`)
- Fields: createdAt, id, permissionId, references, updatedAt, userId
- Usage categories:
  - `createdAt`: defined_in (1), validated_in (3), used_in (68), controllers (20), search_filter (23), imported_in (4), reports (2), services (7)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (4), reports (4), services (14)
  - `permissionId`: defined_in (1), used_in (3), controllers (3), search_filter (3), imported_in (4), reports (1), services (1)
  - `references`: defined_in (1), used_in (28), search_filter (2), imported_in (4), reports (1), services (4)
  - `updatedAt`: defined_in (1), validated_in (3), used_in (54), controllers (7), search_filter (10), imported_in (4), reports (1), services (6)
  - `userId`: defined_in (1), used_in (31), controllers (23), routers (1), search_filter (28), imported_in (4), reports (1), services (4)

### userSession (`modals/userSession/userSession.ts`)
- Fields: deviceInfo, expiresAt, id, ipAddress, isActive, lastActivity, references, sessionToken, userAgent, userId
- Usage categories:
  - `deviceInfo`: defined_in (1), used_in (1), search_filter (1), imported_in (3), reports (1), services (1)
  - `expiresAt`: defined_in (1), used_in (2), search_filter (2), imported_in (3), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (42), imported_in (3), reports (4), services (14)
  - `ipAddress`: defined_in (1), used_in (2), search_filter (1), imported_in (3), reports (1), services (1)
  - `isActive`: defined_in (1), validated_in (23), used_in (45), controllers (20), search_filter (23), imported_in (3), reports (1), services (6)
  - `lastActivity`: defined_in (1), used_in (1), search_filter (1), imported_in (3), reports (1), services (1)
  - `references`: defined_in (1), used_in (28), search_filter (1), imported_in (3), reports (1), services (4)
  - `sessionToken`: defined_in (1), used_in (2), search_filter (2), imported_in (3), reports (1), services (1)
  - `userAgent`: defined_in (1), used_in (2), search_filter (1), imported_in (3), reports (1), services (1)
  - `userId`: defined_in (1), used_in (31), controllers (23), routers (1), search_filter (27), imported_in (3), reports (1), services (4)

### vendorDetails (`modals/masters/vendorDetails/vendorDetails.ts`)
- Fields: address, city_id, company_id, currency_id, gstin, id, isActive, pan_avl_id, references, registration_type_id, state_code_id, subsidiary_id, user_id, validate, vendor_name
- Usage categories:
  - `address`: defined_in (1), used_in (7), controllers (3), search_filter (5), imported_in (10), reports (1), services (2)
  - `city_id`: defined_in (1), validated_in (2), used_in (10), controllers (4), search_filter (5), imported_in (10), reports (1), services (1)
  - `company_id`: defined_in (1), validated_in (4), used_in (10), controllers (4), search_filter (4), imported_in (10), reports (1), services (1)
  - `currency_id`: defined_in (1), validated_in (1), used_in (4), controllers (2), search_filter (2), imported_in (10), reports (1), services (2)
  - `gstin`: defined_in (1), used_in (1), controllers (1), search_filter (1), imported_in (10), reports (1), services (1)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (42), imported_in (10), reports (4), services (14)
  - `isActive`: defined_in (1), validated_in (22), used_in (45), controllers (20), search_filter (23), imported_in (10), reports (1), services (6)
  - `pan_avl_id`: defined_in (1), used_in (2), controllers (1), search_filter (1), imported_in (10), reports (1), services (2)
  - `references`: defined_in (1), used_in (28), search_filter (1), imported_in (10), reports (1), services (4)
  - `registration_type_id`: defined_in (1), used_in (2), controllers (1), search_filter (1), imported_in (10), reports (1), services (2)
  - `state_code_id`: defined_in (1), validated_in (1), used_in (3), controllers (2), search_filter (2), imported_in (10), reports (1), services (1)
  - `subsidiary_id`: defined_in (1), validated_in (11), used_in (28), controllers (13), search_filter (13), imported_in (10), reports (1), services (8)
  - `user_id`: defined_in (1), validated_in (25), used_in (53), controllers (24), search_filter (24), imported_in (10), reports (1), services (6)
  - `validate`: defined_in (1), used_in (38), controllers (5), search_filter (6), imported_in (10), reports (1), services (6)
  - `vendor_name`: defined_in (1), used_in (4), controllers (4), search_filter (4), imported_in (10), reports (1), services (1)

### warehouse (`modals/masters/warehouse/warehouse.ts`)
- Fields: CompanyId, id, licenseNumber, location, name, references
- Usage categories:
  - `CompanyId`: defined_in (1), validated_in (20), used_in (61), controllers (28), routers (1), search_filter (28), imported_in (17), reports (1), services (8)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (17), reports (4), services (14)
  - `licenseNumber`: defined_in (1), used_in (2), controllers (2), search_filter (2), imported_in (17), reports (1), services (1)
  - `location`: defined_in (1), validated_in (1), used_in (11), controllers (6), routers (1), search_filter (8), imported_in (17), reports (2), services (2)
  - `name`: defined_in (1), validated_in (2), used_in (39), controllers (24), routers (3), search_filter (25), imported_in (17), reports (1), services (7)
  - `references`: defined_in (1), used_in (28), search_filter (2), imported_in (17), reports (1), services (4)

### workCatMaster (`modals/masters/workCategory/workCatMaster.ts`)
- Fields: CompanyId, id, isActive, references, subsidiary_id, user_id, work_category_name
- Usage categories:
  - `CompanyId`: defined_in (1), validated_in (19), used_in (61), controllers (28), routers (1), search_filter (28), imported_in (9), reports (1), services (8)
  - `id`: defined_in (1), used_in (126), controllers (36), routers (35), search_filter (43), imported_in (9), reports (4), services (14)
  - `isActive`: defined_in (1), validated_in (22), used_in (45), controllers (20), search_filter (24), imported_in (9), reports (1), services (6)
  - `references`: defined_in (1), used_in (28), search_filter (2), imported_in (9), reports (1), services (4)
  - `subsidiary_id`: defined_in (1), validated_in (11), used_in (28), controllers (13), search_filter (14), imported_in (9), reports (1), services (8)
  - `user_id`: defined_in (1), validated_in (25), used_in (53), controllers (24), search_filter (25), imported_in (9), reports (1), services (6)
  - `work_category_name`: defined_in (1), used_in (3), controllers (3), search_filter (3), imported_in (9), reports (1), services (1)

## Common cross-entity reference fields
- `CompanyId`, `company_id`: widely used for tenant/company context.
- `user_id`, `created_by`: ownership, audit trail, and session-related logic.
- `permissionId`, `permission_id`: links user permissions to permission records.
- `item_id`, `warehouseId`, `godownId`, `uom_id`: inventory and transaction references.
- `subsidiary_id`, `work_category_id`, `customer_id`, `vendorId`: domain-specific relationships for masters and transactions.

## Notes
- The model/field listings are extracted from `project_analysis_v2.json` and should be treated as the code-level authoritative source.
- Field validation and business constraints may exist in additional code paths outside the extracted metadata.