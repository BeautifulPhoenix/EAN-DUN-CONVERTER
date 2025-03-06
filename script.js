// Utility functions from the Python code
function calculateCheckDigit(code) {
    let total = 0;
    for (let i = 0; i < code.length; i++) {
        const digit = parseInt(code[i]);
        if (i % 2 === 0) {
            total += digit;
        } else {
            total += digit * 3;
        }
    }
    const checkDigit = (10 - (total % 10)) % 10;
    return checkDigit.toString();
}

function validateEan13(ean13) {
    if (!/^\d{13}$/.test(ean13)) {
        return false;
    }
    const check = calculateCheckDigit(ean13.slice(0, 12));
    return check === ean13[12];
}

function validateCompanyCode(ean13) {
    const CARINSA_CODE = '843653123';
    const PAYMSA_CODE = '843601903';
    const companyCode = ean13.slice(0, 9);
    
    if (companyCode === CARINSA_CODE) {
        return { valid: true, company: 'Carinsa' };
    } else if (companyCode === PAYMSA_CODE) {
        return { valid: true, company: 'Paymsa' };
    }
    return { valid: false, company: null };
}

function convertEan13ToEan14(ean13, prefix) {
    if (!validateEan13(ean13)) {
        throw new Error("Código EAN-13 inválido");
    }
    if (!/^[0-9]$/.test(prefix)) {
        throw new Error("El prefijo debe ser un dígito (0-9)");
    }

    const ean14WithoutCheck = prefix + ean13.slice(0, 12);
    const checkDigit = calculateCheckDigit(ean14WithoutCheck);
    return ean14WithoutCheck + checkDigit;
}

function convertEan13ToDun14(ean13) {
    if (!validateEan13(ean13)) {
        throw new Error("Código EAN-13 inválido");
    }

    const prefix = '1';
    const dun14WithoutCheck = prefix + ean13.slice(0, 12);
    const checkDigit = calculateCheckDigit(dun14WithoutCheck);
    return dun14WithoutCheck + checkDigit;
}

// UI handling
document.addEventListener('DOMContentLoaded', function() {
    // Toggle prefix input visibility based on conversion type
    function togglePrefixVisibility(formId) {
        const form = document.getElementById(formId);
        const prefixGroup = form.querySelector('[id$="PrefixGroup"]');
        const prefixInput = form.querySelector('[id$="Prefix"]');
        const isEan14 = form.querySelector('[id$="ToEan14"]').checked;

        prefixGroup.style.display = isEan14 ? 'block' : 'none';
        prefixInput.required = isEan14;
    }

    // Handle radio button changes
    ['singleConversionForm', 'batchConversionForm'].forEach(formId => {
        const form = document.getElementById(formId);
        const radioButtons = form.querySelectorAll('input[type="radio"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', () => togglePrefixVisibility(formId));
        });
    });

    // Single conversion form submission
    document.getElementById('singleConversionForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const ean13 = document.getElementById('ean13').value;
        const isEan14 = document.getElementById('toEan14').checked;
        const resultDiv = document.getElementById('singleResult');
        const resultContent = document.getElementById('singleResultContent');

        try {
            let result;
            if (isEan14) {
                const prefix = document.getElementById('prefix').value;
                result = convertEan13ToEan14(ean13, prefix);
            } else {
                result = convertEan13ToDun14(ean13);
            }

            const companyValidation = validateCompanyCode(ean13);
            let companyMessage = '';
            if (companyValidation.valid) {
                companyMessage = `<p class="alert alert-success">Este código pertenece a ${companyValidation.company}</p>`;
            } else {
                companyMessage = `<p class="alert alert-warning">¡Atención! Este código no pertenece ni a Carinsa ni a Paymsa</p>`;
            }

            resultContent.innerHTML = `
                <p><strong>Código original:</strong> ${ean13}</p>
                <p><strong>Código convertido:</strong> ${result}</p>
                <p><strong>Prefijo:</strong> ${result[0]}</p>
                <p><strong>EAN-13 original (sin verificador):</strong> ${result.slice(1, -1)}</p>
                <p><strong>Dígito de control:</strong> ${result.slice(-1)}</p>
                ${companyMessage}
            `;
            resultDiv.classList.remove('d-none');
        } catch (error) {
            resultContent.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
            resultDiv.classList.remove('d-none');
        }
    });

    // Batch conversion form submission
    document.getElementById('batchConversionForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const codes = document.getElementById('batchCodes').value
            .split('\n')
            .map(code => code.trim())
            .filter(code => code.length > 0);

        const isEan14 = document.getElementById('batchToEan14').checked;
        const resultDiv = document.getElementById('batchResult');
        const resultContent = document.getElementById('batchResultContent');

        if (codes.length === 0) {
            resultContent.innerHTML = '<div class="alert alert-warning">No se ingresaron códigos.</div>';
            resultDiv.classList.remove('d-none');
            return;
        }

        const results = [];
        const errors = [];
        const prefix = isEan14 ? document.getElementById('batchPrefix').value : '1';

        if (isEan14 && !/^[0-9]$/.test(prefix)) {
            resultContent.innerHTML = '<div class="alert alert-danger">El prefijo debe ser un dígito (0-9)</div>';
            resultDiv.classList.remove('d-none');
            return;
        }

        codes.forEach(code => {
            try {
                const result = isEan14 ? 
                    convertEan13ToEan14(code, prefix) : 
                    convertEan13ToDun14(code);
                const companyValidation = validateCompanyCode(code);
                results.push({ 
                    original: code, 
                    converted: result, 
                    company: companyValidation.valid ? companyValidation.company : null 
                });
            } catch (error) {
                errors.push({ code, error: error.message });
            }
        });

        let html = `
            <div class="mb-3">
                <p>Conversiones exitosas: ${results.length}</p>
                <p>Conversiones fallidas: ${errors.length}</p>
            </div>
        `;

        if (results.length > 0) {
            html += `
                <div class="mb-3">
                    <h6>Conversiones Exitosas:</h6>
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Original</th>
                                <th>Convertido</th>
                                <th>Empresa</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${results.map(r => `
                                <tr>
                                    <td>${r.original}</td>
                                    <td>${r.converted}</td>
                                    <td>${r.company ? 
                                        `<span class="text-success">${r.company}</span>` : 
                                        `<span class="text-warning">No pertenece a Carinsa/Paymsa</span>`
                                    }</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        if (errors.length > 0) {
            html += `
                <div class="mb-3">
                    <h6>Conversiones Fallidas:</h6>
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Error</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${errors.map(e => `
                                <tr>
                                    <td>${e.code}</td>
                                    <td>${e.error}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        resultContent.innerHTML = html;
        resultDiv.classList.remove('d-none');
    });

    // Initial prefix visibility
    togglePrefixVisibility('singleConversionForm');
    togglePrefixVisibility('batchConversionForm');
});