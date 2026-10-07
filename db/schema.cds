namespace com.manufacturing.bbbee;
using { cuid, managed } from '@sap/cds/common';

type VerificationStatus: String enum {
    Draft;
    PendingReview;
    Approved;
    Rejected;
    Expired;
}

type EnterpriseType: String enum {
    EME; // exempted micro enterprise
    QSE; // qualifying small enterprise
    GEN; // generic enterprise
}

entity Suppliers: managed {
    key ID              : UUID;
    businessPartnerId   : String(10); // so this matches S/4HANA BP Number
    companyName         : String(100);
    registrationNumber  : String(20); // CIPC No.
    taxNumber           : String(10); // SARS No.
    contactEmail        : String(100);
    currentBEELevel     : Integer;
    recognitionFactor   : Decimal(5, 2);
    isBlackOwned        : Boolean;
    isBlackWomenOwned   : Boolean;
    activeCertificate   : Association to Certificates;
    certificates        : Composition of many Certificates on certificates.supplier = $self;
}

entity Certificates: cuid, managed {
    supplier            : Association to Suppliers;
    certificateNumber   : String(50);
    sanasAgencyNumber   : String(30);
    enterpriseType      : EnterpriseType;
    status              : VerificationStatus default 'Draft';
    beeLevel            : Integer;
    blackOwnership      : Decimal(5, 2);
    blackWomenOwnership : Decimal(5, 2);
    issueDate           : Date;
    expiryDate          : Date;
    documentUrl         : String(500);
    rejectionReason     : String(255);
}

entity AuditTrail: cuid, managed {
    certificate     : Association to Certificates;
    action          : String(50);
    performedBy     : String(100);
    previousStatus  : VerificationStatus;
    newStatus       : VerificationStatus;
    remarks         : String(500);
}