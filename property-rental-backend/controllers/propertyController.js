import Property from "../models/Property.js";

export const addProperty = async (req, res) => {
  try {
    const { title, description, location, price, type, bedrooms, bathrooms, image } = req.body;
    const ownerId = req.user._id;

    if (!title || !location || !price || !type || bedrooms == null || bathrooms == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newProperty = new Property({
      title,
      description,
      location,
      price,
      type,
      bedrooms,
      bathrooms,
      image,
      ownerId,
    });

    await newProperty.save();

    res.status(201).json({ message: 'Property added successfully', property: newProperty });
  } catch (error) {
    console.error('Add property error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};


export const getMyProperties = async (req, res) => {
    try {
      const properties = await Property.find({ ownerId: req.user._id });
      res.status(200).json(properties);
    } catch (error) {
      console.error('Get my properties error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  };
  
  export const updateProperty = async (req, res) => {
    try {
      const propertyId = req.params.id;
      const ownerId = req.user._id;
  
      const property = await Property.findOne({ _id: propertyId, ownerId });
  
      if (!property) {
        return res.status(404).json({ error: 'Property not found' });
      }
  
      const updatedData = req.body;
      Object.assign(property, updatedData);
  
      await property.save();
      res.status(200).json({ message: 'Property updated successfully', property });
    } catch (error) {
      console.error('Update property error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  };
  

  export const deleteProperty = async (req, res) => {
    try {
      const property = await Property.findById(req.params.id);
      if (!property) {
        return res.status(404).json({ error: 'Property not found' });
      }
  
      if (!property.ownerId.equals(req.user._id)) {
        return res.status(401).json({ error: 'Not authorized to delete this property' });
      }
  
      await Property.findByIdAndDelete(req.params.id);
      res.json({ message: 'Property deleted successfully' });
    } catch (error) {
      console.error('Delete property error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  };
  
  
  