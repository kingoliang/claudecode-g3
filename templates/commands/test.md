---
name: test
description: 测试生成命令 - 生成测试用例和测试套件
version: 1.0.0
aliases: []
agents: [testing-specialist, code-writer]
namespace: helix
---

# /helix:test 命令

为代码生成全面的测试套件，包括单元测试、集成测试和端到端测试。

## 使用方法

```bash
/helix:test [目标文件或目录]

# 参数选项
--type unit|integration|e2e|all   # 测试类型 (默认: unit)
--coverage <number>               # 目标覆盖率 (默认: 80)
--framework jest|vitest|pytest|mocha  # 测试框架 (自动检测)
--style tdd|bdd                   # 测试风格 (默认: tdd)
--mock auto|manual|none           # Mock 策略 (默认: auto)
--focus happy|edge|error|all      # 关注点 (默认: all)
```

## 示例

```bash
# 为文件生成单元测试
/helix:test src/services/user.ts

# 生成集成测试
/helix:test --type integration src/api/

# 高覆盖率测试
/helix:test --coverage 95 src/utils/

# BDD 风格测试
/helix:test --style bdd src/features/checkout.ts

# 专注边界情况
/helix:test --focus edge src/validators/
```

## 测试类型

### unit - 单元测试

- 函数级别测试
- 类方法测试
- 纯逻辑测试
- 隔离依赖

### integration - 集成测试

- 模块间交互
- 数据库集成
- API 端点测试
- 服务间通信

### e2e - 端到端测试

- 用户流程测试
- UI 交互测试
- 完整业务流程
- 真实环境模拟

## 测试生成策略

### Happy Path 测试

```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with valid data', async () => {
      const userData = { name: 'John', email: 'john@example.com' };
      const result = await userService.createUser(userData);

      expect(result).toBeDefined();
      expect(result.name).toBe('John');
      expect(result.email).toBe('john@example.com');
    });
  });
});
```

### Edge Case 测试

```typescript
describe('UserService', () => {
  describe('createUser - edge cases', () => {
    it('should handle empty name', async () => {
      const userData = { name: '', email: 'john@example.com' };

      await expect(userService.createUser(userData))
        .rejects.toThrow('Name is required');
    });

    it('should handle very long name', async () => {
      const userData = { name: 'A'.repeat(256), email: 'john@example.com' };

      await expect(userService.createUser(userData))
        .rejects.toThrow('Name too long');
    });
  });
});
```

### Error Handling 测试

```typescript
describe('UserService', () => {
  describe('createUser - error handling', () => {
    it('should handle database connection error', async () => {
      jest.spyOn(db, 'connect').mockRejectedValue(new Error('Connection failed'));

      await expect(userService.createUser(validData))
        .rejects.toThrow('Database unavailable');
    });

    it('should handle duplicate email', async () => {
      await userService.createUser({ name: 'John', email: 'john@example.com' });

      await expect(userService.createUser({ name: 'Jane', email: 'john@example.com' }))
        .rejects.toThrow('Email already exists');
    });
  });
});
```

## Mock 策略

### auto - 自动 Mock

```typescript
// 自动识别外部依赖并生成 mock
jest.mock('../services/database');
jest.mock('../services/email');

// 生成的 mock 实现
const mockDatabase = {
  query: jest.fn().mockResolvedValue([]),
  insert: jest.fn().mockResolvedValue({ id: 1 }),
};
```

### manual - 手动 Mock

```typescript
// 提供 mock 骨架，需要手动完善
const mockDatabase = {
  query: jest.fn(),
  insert: jest.fn(),
};

// TODO: 根据测试需求配置 mock 返回值
```

## 执行流程

```
1. 代码分析
   ├── 解析目标文件
   ├── 识别可测试单元
   ├── 分析依赖关系
   └── 检测现有测试

2. 调用 testing-specialist 代理
   ├── 测试策略制定
   ├── 测试用例设计
   └── 覆盖率规划

3. 调用 code-writer 代理
   ├── 生成测试代码
   ├── 生成 Mock 实现
   └── 生成 Fixtures

4. 测试验证
   ├── 语法检查
   ├── 运行测试
   └── 覆盖率报告

5. 迭代改进
   ├── 补充遗漏用例
   └── 优化测试质量
```

## 与其他命令协作

- **前置**: `/helix:code` (代码实现)
- **后续**: `/helix:document` (文档生成)
- **相关**: `/helix:analyze` (代码分析)

## 输出示例

```json
{
  "test_generation": {
    "target": "src/services/user.ts",
    "test_file": "src/services/__tests__/user.test.ts",
    "framework": "jest",
    "style": "tdd",
    "statistics": {
      "test_suites": 1,
      "test_cases": 15,
      "happy_path": 5,
      "edge_cases": 6,
      "error_handling": 4
    },
    "coverage": {
      "target": 80,
      "estimated": 85,
      "lines": 87,
      "branches": 82,
      "functions": 90
    },
    "mocks": [
      {
        "module": "../repositories/user-repository",
        "type": "auto",
        "methods": ["findById", "create", "update"]
      }
    ]
  },
  "recommendations": [
    {
      "type": "improvement",
      "description": "建议添加性能测试用例"
    },
    {
      "type": "coverage",
      "description": "分支 validateEmail 缺少测试覆盖"
    }
  ]
}
```

## 测试质量标准

| 指标 | 良好 | 警告 | 不足 |
|------|------|------|------|
| 行覆盖率 | >= 80% | 60-80% | < 60% |
| 分支覆盖率 | >= 75% | 50-75% | < 50% |
| 函数覆盖率 | >= 90% | 70-90% | < 70% |
| 测试通过率 | 100% | 95-99% | < 95% |
