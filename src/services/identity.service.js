import { pool } from "../config/database.js";

export class IdentityService {
  static async processIdentityRequest(email, phoneNumber) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Find all matching contacts
      const [contacts] = await connection.query(
        `SELECT * FROM Contact WHERE (email = ? OR phoneNumber = ?) AND deletedAt IS NULL ORDER BY createdAt`,
        [email, phoneNumber]
      );

      // 2. Find all primary contacts in the chain
      const primaryContacts = [];
      for (const contact of contacts) {
        let current = contact;
        while (current.linkPrecedence === "secondary") {
          const [primaries] = await connection.query(
            "SELECT * FROM Contact WHERE id = ?",
            [current.linkedId]
          );
          current = primaries[0];
        }
        if (!primaryContacts.some((p) => p.id === current.id)) {
          primaryContacts.push(current);
        }
      }

      // 3. Determine oldest primary
      let mainPrimary = null;
      if (primaryContacts.length > 0) {
        mainPrimary = primaryContacts.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        )[0];
        // Demote other primaries to secondary
        for (const primary of primaryContacts) {
          if (primary.id !== mainPrimary.id) {
            await connection.query(
              `UPDATE Contact SET linkPrecedence = 'secondary', linkedId = ?, updatedAt = NOW() WHERE id = ?`,
              [mainPrimary.id, primary.id]
            );
            await connection.query(
              `UPDATE Contact SET linkedId = ? WHERE linkedId = ?`,
              [mainPrimary.id, primary.id]
            );
          }
        }
      }

      // 4. Create new contact if needed
      let newContact = null;
      let shouldCreateSecondary = false;
      if (contacts.length === 0) {
        // No match, create new primary
        const [result] = await connection.query(
          `INSERT INTO Contact (phoneNumber, email, linkPrecedence, createdAt, updatedAt) VALUES (?, ?, 'primary', NOW(), NOW())`,
          [phoneNumber, email]
        );
        mainPrimary = {
          id: result.insertId,
          email,
          phoneNumber,
          linkPrecedence: "primary",
        };
      } else {
        // Check if incoming info is new
        const hasNewEmail = email && !contacts.some((c) => c.email === email);
        const hasNewPhone =
          phoneNumber && !contacts.some((c) => c.phoneNumber === phoneNumber);
        if (hasNewEmail || hasNewPhone) {
          shouldCreateSecondary = true;
        }
        if (shouldCreateSecondary && mainPrimary) {
          const [result] = await connection.query(
            `INSERT INTO Contact (phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt) VALUES (?, ?, ?, 'secondary', NOW(), NOW())`,
            [phoneNumber, email, mainPrimary.id]
          );
          newContact = {
            id: result.insertId,
            email,
            phoneNumber,
            linkPrecedence: "secondary",
            linkedId: mainPrimary.id,
          };
        }
      }

      // 5. Gather all related contacts for response
      const [allRelated] = await connection.query(
        `SELECT * FROM Contact WHERE (id = ? OR linkedId = ?) AND deletedAt IS NULL ORDER BY createdAt`,
        [mainPrimary.id, mainPrimary.id]
      );
      // Add newContact if not already in list
      if (newContact && !allRelated.some((c) => c.id === newContact.id)) {
        allRelated.push(newContact);
      }

      // Prepare response fields
      const emails = [];
      const phoneNumbers = [];
      const secondaryContactIds = [];
      allRelated.forEach((c) => {
        if (c.linkPrecedence === "primary") {
          if (c.email && !emails.includes(c.email)) emails.unshift(c.email);
          if (c.phoneNumber && !phoneNumbers.includes(c.phoneNumber))
            phoneNumbers.unshift(c.phoneNumber);
        } else {
          if (c.email && !emails.includes(c.email)) emails.push(c.email);
          if (c.phoneNumber && !phoneNumbers.includes(c.phoneNumber))
            phoneNumbers.push(c.phoneNumber);
          secondaryContactIds.push(c.id);
        }
      });

      await connection.commit();
      return {
        contact: {
          primaryContatctId: mainPrimary.id,
          emails,
          phoneNumbers,
          secondaryContactIds,
        },
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
