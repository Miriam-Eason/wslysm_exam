-- Baseline schema for the version deployed at commit 0d0879b.
-- Existing installations that match that commit must mark this migration as
-- applied with `prisma migrate resolve --applied 20260702000000_initial_baseline`
-- instead of executing it.

CREATE TABLE `Teacher` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isAdmin` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `Teacher_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Student` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `studentNo` VARCHAR(10) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `mustResetPwd` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `Student_studentNo_key`(`studentNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Class` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `teacherId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `Class_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ClassTeacher` (
    `classId` INTEGER NOT NULL,
    `teacherId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `ClassTeacher_teacherId_idx`(`teacherId`),
    PRIMARY KEY (`classId`, `teacherId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Enrollment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `studentId` INTEGER NOT NULL,
    `classId` INTEGER NOT NULL,
    INDEX `Enrollment_classId_idx`(`classId`),
    UNIQUE INDEX `Enrollment_studentId_classId_key`(`studentId`, `classId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `QuestionBank` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `subject` VARCHAR(191) NULL,
    `createdBy` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Question` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bankId` INTEGER NOT NULL,
    `type` ENUM('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK') NOT NULL,
    `stem` TEXT NOT NULL,
    `options` JSON NULL,
    `answer` JSON NOT NULL,
    `difficulty` ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL DEFAULT 'MEDIUM',
    `analysis` TEXT NULL,
    `textbook` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NULL,
    `knowledgePoint` VARCHAR(191) NULL,
    `tags` VARCHAR(191) NULL,
    `score` INTEGER NULL,
    `externalId` VARCHAR(191) NULL,
    `contentHash` VARCHAR(191) NOT NULL,
    `importBatchId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `Question_type_idx`(`type`),
    INDEX `Question_difficulty_idx`(`difficulty`),
    INDEX `Question_importBatchId_idx`(`importBatchId`),
    UNIQUE INDEX `Question_bankId_contentHash_key`(`bankId`, `contentHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `KnowledgePoint` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `QuestionKnowledgePoint` (
    `questionId` INTEGER NOT NULL,
    `knowledgePointId` INTEGER NOT NULL,
    PRIMARY KEY (`questionId`, `knowledgePointId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Exam` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('EXAM', 'PRACTICE') NOT NULL,
    `allowRepeat` BOOLEAN NOT NULL DEFAULT false,
    `repeatLimit` INTEGER NULL,
    `deadline` DATETIME(3) NULL,
    `timeLimitSec` INTEGER NULL,
    `shuffleQuestions` BOOLEAN NOT NULL DEFAULT false,
    `shuffleOptions` BOOLEAN NOT NULL DEFAULT false,
    `createdBy` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ExamQuestion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `examId` INTEGER NOT NULL,
    `sourceId` INTEGER NULL,
    `order` INTEGER NOT NULL,
    `score` DOUBLE NOT NULL,
    `type` ENUM('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK') NOT NULL,
    `stem` TEXT NOT NULL,
    `options` JSON NULL,
    `answer` JSON NOT NULL,
    `analysis` TEXT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ExamClass` (
    `examId` INTEGER NOT NULL,
    `classId` INTEGER NOT NULL,
    PRIMARY KEY (`examId`, `classId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Attempt` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `examId` INTEGER NOT NULL,
    `studentId` INTEGER NOT NULL,
    `attemptNo` INTEGER NOT NULL,
    `status` ENUM('IN_PROGRESS', 'SUBMITTED') NOT NULL DEFAULT 'IN_PROGRESS',
    `score` DOUBLE NULL,
    `elapsedSec` INTEGER NOT NULL DEFAULT 0,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSavedAt` DATETIME(3) NULL,
    `submittedAt` DATETIME(3) NULL,
    UNIQUE INDEX `Attempt_examId_studentId_attemptNo_key`(`examId`, `studentId`, `attemptNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AnswerItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `attemptId` INTEGER NOT NULL,
    `examQuestionId` INTEGER NOT NULL,
    `chosen` JSON NOT NULL,
    `isCorrect` BOOLEAN NOT NULL DEFAULT false,
    `scoreGot` DOUBLE NOT NULL DEFAULT 0,
    INDEX `AnswerItem_examQuestionId_idx`(`examQuestionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WrongQuestion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `studentId` INTEGER NOT NULL,
    `examQuestionId` INTEGER NOT NULL,
    `redoCount` INTEGER NOT NULL DEFAULT 0,
    `lastResult` BOOLEAN NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `WrongQuestion_studentId_examQuestionId_key`(`studentId`, `examQuestionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Class` ADD CONSTRAINT `Class_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `Teacher`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ClassTeacher` ADD CONSTRAINT `ClassTeacher_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `Class`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ClassTeacher` ADD CONSTRAINT `ClassTeacher_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `Teacher`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Enrollment` ADD CONSTRAINT `Enrollment_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Enrollment` ADD CONSTRAINT `Enrollment_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `Class`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `QuestionBank` ADD CONSTRAINT `QuestionBank_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `Teacher`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Question` ADD CONSTRAINT `Question_bankId_fkey` FOREIGN KEY (`bankId`) REFERENCES `QuestionBank`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `QuestionKnowledgePoint` ADD CONSTRAINT `QuestionKnowledgePoint_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `QuestionKnowledgePoint` ADD CONSTRAINT `QuestionKnowledgePoint_knowledgePointId_fkey` FOREIGN KEY (`knowledgePointId`) REFERENCES `KnowledgePoint`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Exam` ADD CONSTRAINT `Exam_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `Teacher`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ExamQuestion` ADD CONSTRAINT `ExamQuestion_examId_fkey` FOREIGN KEY (`examId`) REFERENCES `Exam`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ExamClass` ADD CONSTRAINT `ExamClass_examId_fkey` FOREIGN KEY (`examId`) REFERENCES `Exam`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ExamClass` ADD CONSTRAINT `ExamClass_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `Class`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Attempt` ADD CONSTRAINT `Attempt_examId_fkey` FOREIGN KEY (`examId`) REFERENCES `Exam`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Attempt` ADD CONSTRAINT `Attempt_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `AnswerItem` ADD CONSTRAINT `AnswerItem_attemptId_fkey` FOREIGN KEY (`attemptId`) REFERENCES `Attempt`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AnswerItem` ADD CONSTRAINT `AnswerItem_examQuestionId_fkey` FOREIGN KEY (`examQuestionId`) REFERENCES `ExamQuestion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `WrongQuestion` ADD CONSTRAINT `WrongQuestion_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `WrongQuestion` ADD CONSTRAINT `WrongQuestion_examQuestionId_fkey` FOREIGN KEY (`examQuestionId`) REFERENCES `ExamQuestion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
