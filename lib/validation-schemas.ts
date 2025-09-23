import { z } from "zod"

export const LoginSchema = z.object({
  email: z.string().email("Invalid email format").min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
  otp: z.string().optional(),
})

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/\d/, "Password must contain at least one number")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character"),
})

export const AttendanceSchema = z.object({
  location_id: z.string().uuid("Invalid location ID"),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  device_info: z
    .object({
      user_agent: z.string().optional(),
      ip_address: z.string().optional(),
      device_type: z.string().optional(),
    })
    .optional(),
})

export const UserProfileSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email format"),
  phone: z
    .string()
    .regex(/^\+?[\d\s-()]+$/, "Invalid phone number format")
    .optional(),
  department_id: z.string().uuid("Invalid department ID"),
  region_id: z.string().uuid("Invalid region ID"),
  role: z.enum(["admin", "department_head", "staff"]),
  assigned_location_id: z.string().uuid("Invalid location ID").optional(),
})

export const LocationSchema = z.object({
  name: z.string().min(2, "Location name must be at least 2 characters").max(100),
  address: z.string().min(5, "Address must be at least 5 characters").max(255),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().min(1).max(1000, "Radius must be between 1 and 1000 meters"),
  department_id: z.string().uuid("Invalid department ID"),
  is_active: z.boolean().default(true),
})

export const QRCodeSchema = z.object({
  location_id: z.string().uuid("Invalid location ID"),
  expires_at: z.string().datetime("Invalid expiration date"),
  signature: z.string().min(1, "Signature is required"),
})

// Helper function to validate request body
export function validateRequestBody<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      throw new Error(`Validation failed: ${firstError.message}`)
    }
    throw error
  }
}
