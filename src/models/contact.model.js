// Migration SQL for Contact table (run this in your MySQL client)
export const ContactSchema = `
  CREATE TABLE IF NOT EXISTS Contact (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phoneNumber VARCHAR(255),
    email VARCHAR(255),
    linkedId INT,
    linkPrecedence ENUM('primary', 'secondary'),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deletedAt DATETIME,
    INDEX idx_email (email),
    INDEX idx_phone (phoneNumber)
  );
`;
