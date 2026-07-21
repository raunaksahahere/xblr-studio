import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'xbrlstudio_super_secret_access_key_12345!';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'xbrlstudio_super_secret_refresh_key_98765!';

export const registerUser = async (req: Request, res: Response) => {
  const { email, password, name, organizationName, roleName } = req.body;

  try {
    if (!email || !password || !name || !organizationName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create organization, role if doesn't exist, and the user
    const organization = await prisma.organization.create({
      data: {
        name: organizationName,
        billingEmail: email,
        subscriptions: {
          create: {
            plan: 'ENTERPRISE',
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          },
        },
      },
    });

    let role = await prisma.role.findUnique({ where: { name: roleName || 'ADMIN' } });
    if (!role) {
      role = await prisma.role.create({
        data: {
          name: roleName || 'ADMIN',
          description: `${roleName || 'ADMIN'} role`,
        },
      });
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        roleId: role.id,
        organizationId: organization.id,
      },
      include: {
        role: true,
        organization: true,
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        email: user.email,
        action: 'USER_REGISTERED',
        targetId: user.id,
        targetType: 'User',
        details: JSON.stringify({ name: user.name, organization: organization.name }),
      },
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        organization: user.organization.name,
      },
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true, organization: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'User account is not active' });
    }

    // Generate tokens
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role.name,
      organizationId: user.organizationId,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    // Log Login action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        email: user.email,
        action: 'USER_LOGIN',
        targetId: user.id,
        targetType: 'User',
        details: JSON.stringify({ ip: req.ip }),
      },
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const googleLogin = async (req: Request, res: Response) => {
  const { email, name, googleId } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ error: 'Email is required for Google authentication' });
    }

    let user = await prisma.user.findUnique({
      where: { email },
      include: { role: true, organization: true },
    });

    if (!user) {
      // Auto-provision default organization for new Google OAuth user
      const organization = await prisma.organization.create({
        data: {
          name: `${name || 'User'}'s Organization`,
          billingEmail: email,
          subscriptions: {
            create: {
              plan: 'ENTERPRISE',
              endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            },
          },
        },
      });

      let role = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
      if (!role) {
        role = await prisma.role.create({
          data: {
            name: 'ADMIN',
            description: 'Admin role',
          },
        });
      }

      const randomHash = await bcrypt.hash(`google-oauth-${Date.now()}`, 10);
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: randomHash,
          name: name || email.split('@')[0],
          roleId: role.id,
          organizationId: organization.id,
        },
        include: {
          role: true,
          organization: true,
        },
      });
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role.name,
      organizationId: user.organizationId,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        email: user.email,
        action: 'GOOGLE_OAUTH_LOGIN',
        targetId: user.id,
        targetType: 'User',
        details: JSON.stringify({ ip: req.ip, googleId }),
      },
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
      },
    });
  } catch (error) {
    console.error('Google OAuth Error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  try {
    jwt.verify(token, JWT_REFRESH_SECRET, (err: any, decoded: any) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired refresh token' });
      }

      const payload = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        organizationId: decoded.organizationId,
      };

      const newAccessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
      res.json({ accessToken: newAccessToken });
    });
  } catch (error) {
    console.error('Token Refresh Error:', error);
    res.status(500).json({ error: 'Refresh failed' });
  }
};

export const getMe = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { role: true, organization: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      organizationId: user.organizationId,
      organizationName: user.organization.name,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
};
