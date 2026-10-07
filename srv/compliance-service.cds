using { com.manufacturing.bbbee as my } from '../db/schema';

// lock the entire service to logged-in users only
@path: '/odata/v4/compliance'
@requires: 'authenticated-user'
service ComplianceService {
    
    entity Suppliers as projection on my.Suppliers;
    
    entity Certificates as projection on my.Certificates;
    
    // make the audit trail read-only
    @readonly
    entity AuditTrail as projection on my.AuditTrail;

    action uploadCertificate(
        supplierId: UUID, 
        enterpriseType: String,
        file: LargeBinary
    ) returns Certificates;
    
    // restrict the S/4HANA sync action to a specific BTP Role Collection
    @requires: 'ComplianceOfficer'
    action approveCertificate(certificateId: UUID) returns Certificates;

}