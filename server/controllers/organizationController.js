import Organization from '../models/Organization.js';
import cloudinary from '../config/cloudinary.js';
import { io } from '../server.js';

export const getOrganization = async (req, res) => {
  try {
    let organization = await Organization.findOne();
    if (!organization) {
      try {
        organization = await Organization.create({
          name: 'Katuwal Bansha',
          description: 'Katuwal Bansha Official Portal',
        });
      } catch {
        organization = (await Organization.findOne()) || { name: 'Katuwal Bansha', logo: null };
      }
    }
    res.json(organization);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createOrganization = async (req, res) => {
  try {
    const existing = await Organization.findOne();
    if (existing) {
      return res.status(400).json({ message: 'Organization already exists' });
    }

    const organization = new Organization({
      ...req.body,
      logo: req.file?.path || null,
      createdBy: req.user?._id || null,
    });

    await organization.save();
    if (io) io.to('role:admin').emit('organization:updated', organization);
    res.status(201).json(organization);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Organization name already exists' });
    }
    res.status(400).json({ message: error.message });
  }
};

export const updateOrganization = async (req, res) => {
  try {
    let organization = await Organization.findOne();
    if (!organization) {
      organization = new Organization({
        name: 'Katuwal Bansha',
        ...req.body,
        logo: req.file?.path || null,
        createdBy: req.user?._id || null,
      });
      await organization.save();
      if (io) io.to('role:admin').emit('organization:updated', organization);
      return res.json(organization);
    }

    // Delete old logo if new one uploaded
    if (req.file && organization.logo && typeof organization.logo === 'string' && organization.logo.includes('cloudinary')) {
      try {
        const publicId = organization.logo.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.warn('Failed to delete old logo from Cloudinary:', err.message);
      }
    }

    const updatedOrg = await Organization.findByIdAndUpdate(
      organization._id,
      {
        ...req.body,
        logo: req.file?.path || organization.logo,
        updatedBy: req.user?._id || null,
      },
      { returnDocument: 'after', runValidators: true }
    );

    if (io) io.to('role:admin').emit('organization:updated', updatedOrg);
    res.json(updatedOrg);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Organization name already exists' });
    }
    res.status(400).json({ message: error.message });
  }
};

export const deleteOrganization = async (req, res) => {
  try {
    const organization = await Organization.findOne();
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Delete logo from Cloudinary
    if (organization.logo && typeof organization.logo === 'string' && organization.logo.includes('cloudinary')) {
      try {
        const publicId = organization.logo.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.warn('Failed to delete logo from Cloudinary:', err.message);
      }
    }

    await Organization.deleteOne({ _id: organization._id });
    if (io) io.to('role:admin').emit('organization:deleted', { id: organization._id });
    res.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadOrganizationLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    let organization = await Organization.findOne();
    if (!organization) {
      organization = new Organization({
        name: 'Katuwal Bansha',
        logo: req.file.path,
        createdBy: req.user?._id || null,
      });
    } else {
      // Delete old logo safely if on Cloudinary
      if (organization.logo && typeof organization.logo === 'string' && organization.logo.includes('cloudinary')) {
        try {
          const publicId = organization.logo.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.warn('Failed to delete old logo from Cloudinary:', err.message);
        }
      }
      organization.logo = req.file.path;
      organization.updatedBy = req.user?._id || null;
    }

    await organization.save();

    if (io) io.to('role:admin').emit('organization:updated', organization);
    res.json({ logo: organization.logo, organization });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
