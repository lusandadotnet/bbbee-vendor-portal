import cds from '@sap/cds';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfRaw = require('pdf-parse');
const pdf = pdfRaw.default || pdfRaw; 

export default cds.service.impl(async function() {
    const { Certificates, AuditTrail } = this.entities; 

    this.on('uploadCertificate', async (req) => {
        const { supplierId, enterpriseType, file } = req.data;

        if (!file) return req.reject(400, 'No document payload provided.');

        let extractedText = '';
        try {
            // change incoming file
            const isBase64 = typeof file === 'string';
            const fileBuffer = isBase64 ? Buffer.from(file.replace(/^data:application\/pdf;base64,/, ''), 'base64') : Buffer.from(file);

            // pass raw bytes to the local OCR
            const pdfData = await pdf(fileBuffer);
            extractedText = pdfData.text;
            console.log('\n[OCR PIPELINE] Successfully extracted text stream from PDF.');
        } catch (error) {
            console.error('[OCR PIPELINE ERROR] Failed to parse PDF binary:', error);
            return req.reject(500, 'Failed to extract text from the provided PDF document.');
        }

        // 3. Dynamic Regex Extraction (Replacing the Mock)
        // looks for "Level 1", "Level: 2"
        const levelMatch = extractedText.match(/Level\s*:?\s*(\d)/i);
        const beeLevel = levelMatch ? parseInt(levelMatch[1], 10) : null;

        // looks for "Black Ownership: 55%"
        const blackOwnMatch = extractedText.match(/(?:Black Ownership|Black Owned).*?(\d{1,3}(?:\.\d+)?)\s*%/i);
        const blackOwnership = blackOwnMatch ? parseFloat(blackOwnMatch[1]) : 0.0;

        // looks for "Black Women Ownership: 35%"
        const blackWomenOwnMatch = extractedText.match(/(?:Black Women|Black Female).*?(\d{1,3}(?:\.\d+)?)\s*%/i);
        const blackWomenOwnership = blackWomenOwnMatch ? parseFloat(blackWomenOwnMatch[1]) : 0.0;

        console.log(`[OCR PIPELINE] Extracted Values -> Level: ${beeLevel || 'NOT FOUND'}, Black Ownership: ${blackOwnership}%`);

        // fallback dates for demo purposes (valid from today for 1 year)
        const issueDate = new Date();
        const expiryDate = new Date();
        expiryDate.setFullYear(issueDate.getFullYear() + 1);

        // apply business bules based on extracted data
        let isBlackOwned = blackOwnership >= 51.0; 
        let isBlackWomenOwned = blackWomenOwnership >= 30.0;

        let status = 'PendingReview';
        let rejectionReason = '';

        // auto-reject if OCR engine couldn't find a valid B-BBEE Level
        if (!beeLevel) {
            status = 'Rejected';
            rejectionReason = 'AI Extraction Failed: Could not detect a valid B-BBEE Level from the document text.';
        }

        // insert parsed record into the Hana
        const newCertificate = await INSERT.into(Certificates).entries({
            supplier_ID: supplierId,
            enterpriseType: enterpriseType,
            status: status,
            beeLevel: beeLevel || 99, // remember bru 99 acts as an error state flag in the Db
            blackOwnership: blackOwnership,
            blackWomenOwnership: blackWomenOwnership,
            issueDate: issueDate.toISOString().split('T')[0],
            expiryDate: expiryDate.toISOString().split('T')[0],
            rejectionReason: rejectionReason
        });

        return newCertificate;
    });

    // logic: sync to s/4hana
    this.on('approveCertificate', async (req) => {
        const { certificateId } = req.data;

        // fetch the certificate and its linked supplier details
        const cert = await SELECT.one.from(Certificates)
            .where({ ID: certificateId })
            .columns(c => { c('*'), c.supplier(s => s('*')) });

        if (!cert) return req.reject(404, 'Certificate not found.');

        // connect to the S/4HANA mock destination
        const s4hanaApi = await cds.connect.to('API_BUSINESS_PARTNER');
        
        // destructure the entity definition from the external metadata
        const { A_BusinessPartner } = s4hanaApi.entities;

        try {
            // execute S/4HANA update payload
            await s4hanaApi.run(
                UPDATE(A_BusinessPartner, { BusinessPartner: cert.supplier.businessPartnerId })
                    .with({
                        BusinessPartnerIsBlocked: false 
                    })
            );

            // update local BTP status
            await UPDATE(Certificates)
                .set({ status: 'Approved' })
                .where({ ID: certificateId });

            // add to audit trail
            await INSERT.into(AuditTrail).entries({
                certificate_ID: certificateId,
                action: 'Approval & S/4HANA Sync',
                performedBy: req.user?.id || 'compliance.officer@mfg.co.za',
                previousStatus: cert.status,
                newStatus: 'Approved',
                remarks: 'Successfully synced compliance data to S/4HANA Clean Core.'
            });

            // return the successfully updated certificate
            return await SELECT.one.from(Certificates).where({ ID: certificateId });

        } catch (error) {
            return req.reject(500, `S/4HANA Sync Failed: ${error.message}`);
        }
    });
});