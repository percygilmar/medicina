// Datos iniciales
let users = JSON.parse(localStorage.getItem('medicalUsers')) || [
  {
    id: 1,
    name: "Administrador",
    email: "admin@hospital.com",
    password: btoa("Admin123*")
  }
];

let patients = JSON.parse(localStorage.getItem('medicalPatients')) || [];
let currentUser = null;

// Elementos del DOM
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const patientForm = document.getElementById('patient-form');
const patientTable = document.getElementById('patient-table');
const userEmailSpan = document.getElementById('user-email');
const toastEl = document.getElementById('toast');

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
  checkSession();
  setupPasswordToggles();
  setupEventListeners();
});

// Funciones principales
function checkSession() {
  const session = sessionStorage.getItem('currentUser');
  if (session) {
    currentUser = JSON.parse(session);
    showApp();
    loadPatients();
  }
}

function setupPasswordToggles() {
  document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', function() {
      const input = this.parentElement.querySelector('input');
      const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
      input.setAttribute('type', type);
      this.innerHTML = type === 'password' ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
    });
  });
}

function setupEventListeners() {
  // Autenticación
  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegister);
  document.getElementById('show-register').addEventListener('click', showRegisterForm);
  document.getElementById('show-login').addEventListener('click', showLoginForm);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);

  // Pacientes
  patientForm.addEventListener('submit', handlePatientSubmit);

  // Validación de contraseña en tiempo real
  document.getElementById('register-password').addEventListener('input', function() {
    validatePasswordFeedback(this.value);
  });
}

// Autenticación
function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const user = users.find(u => u.email === email && u.password === btoa(password));
  
  if (user) {
    currentUser = user;
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    showApp();
    loadPatients();
    showToast('Bienvenido ' + user.name, 'success');
  } else {
    showToast('Credenciales incorrectas', 'danger');
  }
}

function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const confirm = document.getElementById('register-confirm').value;

  // Validaciones
  if (password !== confirm) {
    showToast('Las contraseñas no coinciden', 'danger');
    return;
  }

  // Validar complejidad de la contraseña
  if (!validatePassword(password)) {
    showToast('La contraseña debe tener al menos 8 caracteres, una mayúscula y una minúscula', 'danger');
    return;
  }

  if (users.some(u => u.email === email)) {
    showToast('El email ya está registrado', 'danger');
    return;
  }

  const newUser = {
    id: Date.now(),
    name,
    email,
    password: btoa(password)
  };

  users.push(newUser);
  localStorage.setItem('medicalUsers', JSON.stringify(users));
  showToast('Registro exitoso. Por favor inicie sesión', 'success');
  showLoginForm();
}

function handleLogout() {
  sessionStorage.removeItem('currentUser');
  currentUser = null;
  showAuth();
  showToast('Sesión cerrada correctamente', 'info');
}

// Validación de contraseña
function validatePassword(password) {
  // Al menos 8 caracteres, una mayúscula y una minúscula
  const regex = /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
  return regex.test(password);
}

// Feedback visual para la contraseña
function validatePasswordFeedback(password) {
  const feedbackElement = document.getElementById('register-password').nextElementSibling.nextElementSibling;
  
  if (password.length === 0) {
    feedbackElement.className = 'form-text text-muted';
    feedbackElement.textContent = 'La contraseña debe tener al menos 8 caracteres, una mayúscula y una minúscula';
  } else if (!validatePassword(password)) {
    feedbackElement.className = 'form-text text-danger';
    feedbackElement.textContent = 'No cumple los requisitos';
  } else {
    feedbackElement.className = 'form-text text-success';
    feedbackElement.textContent = 'Contraseña válida';
  }
}

// Pacientes
function handlePatientSubmit(e) {
  e.preventDefault();
  
  const newPatient = {
    id: Date.now(),
    name: document.getElementById('patient-name').value.trim(),
    age: parseInt(document.getElementById('patient-age').value),
    gender: document.getElementById('patient-gender').value,
    document: document.getElementById('patient-document').value.trim(),
    symptoms: document.getElementById('patient-symptoms').value.trim(),
    severity: document.querySelector('input[name="severity"]:checked').value,
    createdAt: new Date().toISOString(),
    createdBy: currentUser.id
  };

  if (!validatePatient(newPatient)) return;

  patients.push(newPatient);
  localStorage.setItem('medicalPatients', JSON.stringify(patients));
  
  patientForm.reset();
  loadPatients();
  showToast('Paciente registrado exitosamente', 'success');
}

function validatePatient(patient) {
  if (!patient.name || patient.name.length < 3) {
    showToast('El nombre debe tener al menos 3 caracteres', 'danger');
    return false;
  }
  
  if (isNaN(patient.age) || patient.age < 0 || patient.age > 120) {
    showToast('La edad debe ser entre 0 y 120 años', 'danger');
    return false;
  }
  
  if (!patient.document || patient.document.length < 4) {
    showToast('El documento debe tener al menos 4 caracteres', 'danger');
    return false;
  }
  
  if (!patient.symptoms || patient.symptoms.length < 5) {
    showToast('Describa los síntomas (mínimo 5 caracteres)', 'danger');
    return false;
  }
  
  if (!patient.severity) {
    showToast('Seleccione el nivel de gravedad', 'danger');
    return false;
  }
  
  return true;
}

function loadPatients() {
  patientTable.innerHTML = '';
  
  // Ordenar por gravedad (críticos primero)
  const sortedPatients = [...patients].sort((a, b) => {
    const severityOrder = { 'critico': 4, 'urgente': 3, 'moderado': 2, 'leve': 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });

  sortedPatients.forEach(patient => {
    const row = document.createElement('tr');
    row.className = `triaje-${patient.severity}`;
    row.innerHTML = `
      <td>${patient.name}</td>
      <td>${patient.age}</td>
      <td>${patient.gender}</td>
      <td>${patient.document}</td>
      <td>${patient.symptoms.substring(0, 50)}${patient.symptoms.length > 50 ? '...' : ''}</td>
      <td><span class="badge bg-${patient.severity}">${patient.severity.toUpperCase()}</span></td>
      <td><button class="btn btn-danger btn-sm" onclick="deletePatient(${patient.id})"><i class="bi bi-trash"></i></button></td>
    `;
    patientTable.appendChild(row);
  });
}

function deletePatient(id) {
  if (confirm('¿Está seguro de eliminar este paciente?')) {
    patients = patients.filter(p => p.id !== id);
    localStorage.setItem('medicalPatients', JSON.stringify(patients));
    loadPatients();
    showToast('Paciente eliminado', 'info');
  }
}

// Helpers
function showApp() {
  authContainer.classList.add('d-none');
  appContainer.classList.remove('d-none');
  userEmailSpan.textContent = currentUser.email;
}

function showAuth() {
  appContainer.classList.add('d-none');
  authContainer.classList.remove('d-none');
  loginForm.reset();
  registerForm.reset();
  showLoginForm();
}

function showRegisterForm() {
  loginForm.classList.add('d-none');
  registerForm.classList.remove('d-none');
  document.getElementById('register-name').focus();
}

function showLoginForm() {
  registerForm.classList.add('d-none');
  loginForm.classList.remove('d-none');
  document.getElementById('login-email').focus();
}

function showToast(message, type = 'info') {
  const toast = new bootstrap.Toast(toastEl);
  const toastTitle = document.getElementById('toast-title');
  const toastMsg = document.getElementById('toast-message');
  
  // Configurar según tipo
  toastEl.className = `toast ${type === 'danger' ? 'toast-error' : type === 'success' ? 'toast-success' : 'toast-info'}`;
  toastTitle.textContent = type === 'danger' ? 'Error' : type === 'success' ? 'Éxito' : 'Información';
  toastMsg.textContent = message;
  
  toast.show();
}

// Hacer funciones globales
window.deletePatient = deletePatient;
