import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

const database = SQLite.openDatabase('vibecheck.db');
const LEGACY_USERS_KEY = 'users';
let initialization;

function executeSql(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    let result;
    database.transaction(
      (transaction) => {
        transaction.executeSql(sql, parameters, (_transaction, queryResult) => {
          result = queryResult;
        });
      },
      reject,
      () => resolve(result)
    );
  });
}

function passwordKey(accountId) {
  return `vibecheck.account-password.${accountId}`;
}

async function migrateLegacyAccounts() {
  const rawUsers = await AsyncStorage.getItem(LEGACY_USERS_KEY);
  if (!rawUsers) return;

  const users = JSON.parse(rawUsers);
  if (
    !Array.isArray(users) ||
    users.some(
      (user) =>
        !user ||
        typeof user.username !== 'string' ||
        !user.username.trim() ||
        typeof user.password !== 'string' ||
        !user.password.trim()
    )
  ) {
    throw new Error('The saved account data could not be migrated.');
  }

  for (const user of users) {
    const username = user.username.trim();
    const result = await executeSql('SELECT id FROM accounts WHERE username = ?', [
      username
    ]);
    let accountId;

    if (result.rows.length > 0) {
      accountId = result.rows.item(0).id;
      const existingPassword = await SecureStore.getItemAsync(passwordKey(accountId));
      if (existingPassword !== null) continue;
    } else {
      const inserted = await executeSql('INSERT INTO accounts (username) VALUES (?)', [
        username
      ]);
      accountId = inserted.insertId;
    }

    await SecureStore.setItemAsync(passwordKey(accountId), user.password.trim());
  }

  await AsyncStorage.removeItem(LEGACY_USERS_KEY);
}

function initialize() {
  if (!initialization) {
    initialization = executeSql(
      `CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    )
      .then(migrateLegacyAccounts)
      .catch((error) => {
        initialization = undefined;
        throw error;
      });
  }

  return initialization;
}

export async function saveAccount(username, password) {
  await initialize();

  const normalizedUsername = username.trim();
  const normalizedPassword = password.trim();
  const existing = await executeSql('SELECT id FROM accounts WHERE username = ?', [
    normalizedUsername
  ]);
  if (existing.rows.length > 0) return false;

  const inserted = await executeSql('INSERT INTO accounts (username) VALUES (?)', [
    normalizedUsername
  ]);
  try {
    await SecureStore.setItemAsync(passwordKey(inserted.insertId), normalizedPassword);
  } catch (error) {
    try {
      await executeSql('DELETE FROM accounts WHERE id = ?', [inserted.insertId]);
    } catch (cleanupError) {
      console.error('Unable to clean up an incomplete account record:', cleanupError);
    }
    throw error;
  }

  return true;
}

export async function authenticateAccount(username, password) {
  await initialize();

  const result = await executeSql('SELECT id FROM accounts WHERE username = ?', [
    username.trim()
  ]);
  if (result.rows.length === 0) return 'not-found';

  const storedPassword = await SecureStore.getItemAsync(
    passwordKey(result.rows.item(0).id)
  );
  if (storedPassword === null) {
    throw new Error('The account password is unavailable in secure storage.');
  }

  return storedPassword === password.trim() ? 'authenticated' : 'invalid-password';
}
