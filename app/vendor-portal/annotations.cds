using ComplianceService from '../../srv/compliance-service';

// Table View
annotate ComplianceService.Certificates with @(
    UI: {
        HeaderInfo: {
            TypeName: 'B-BBEE Certificate',
            TypeNamePlural: 'B-BBEE Certificates',
            Title: { Value: supplier.name }
        },
        LineItem: [
            { Value: supplier.businessPartnerId, Label: 'SAP BP ID' },
            { Value: enterpriseType, Label: 'Enterprise Type' },
            { Value: beeLevel, Label: 'B-BBEE Level' },
            { Value: status, Label: 'Status' },
            { Value: expiryDate, Label: 'Expiry Date' }
        ]
    }
);

// Detail View
annotate ComplianceService.Certificates with @(
    UI: {
        Facets: [
            {
                $Type: 'UI.ReferenceFacet',
                Label: 'Compliance Details',
                Target: '@UI.FieldGroup#Details'
            }
        ],
        FieldGroup#Details: {
            Data: [
                { Value: blackOwnership, Label: 'Black Ownership (%)' },
                { Value: blackWomenOwnership, Label: 'Black Women Ownership (%)' },
                { Value: issueDate, Label: 'Issue Date' },
                { Value: rejectionReason, Label: 'Rejection Reason' }
            ]
        },
        // Action Button
        Identification: [
            {
                $Type: 'UI.DataFieldForAction',
                Action: 'ComplianceService.approveCertificate',
                Label: 'Approve & Sync to S/4HANA'
            }
        ]
    }
);