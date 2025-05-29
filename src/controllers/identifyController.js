import { IdentityService } from "../services/identity.service.js";

export const identifyContact = async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;
    if (!email && !phoneNumber) {
      return res.status(400).json({ error: "Email or phoneNumber required" });
    }
    const data = await IdentityService.processIdentityRequest(
      email,
      phoneNumber
    );
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
