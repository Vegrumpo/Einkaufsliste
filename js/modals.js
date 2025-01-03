// Modal-Steuerung

export function initModals() {
document.addEventListener('click', (event) => {
    if (event.target.classList.contains('open-modal')) {
        const modalId = event.target.getAttribute('data-modal-target');
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
        } else {
            console.error(`Modal mit ID "${modalId}" nicht gefunden.`);
        }
    }

    if (event.target.classList.contains('close-modal')) {
        const modal = event.target.closest('.modal-overlay');
        if (modal) {
            modal.style.display = 'none';
        }
    }
});
}


