"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { User, Mail } from "lucide-react";

export default function AccountSettings() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 max-w-3xl"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <h2 className="text-xl font-semibold tracking-tight mb-4">Profile</h2>
        <motion.div 
          className="grid gap-6 rounded-2xl border bg-card p-6 transition-all duration-200 hover:shadow-md hover:border-border/80"
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex items-start gap-6">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center border-2 border-border">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-4">
              <div className="grid gap-2">
                <Label>Display Name</Label>
                <Input 
                  defaultValue="User" 
                  className="transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring/50"
                />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground transition-colors duration-200" />
                  <Input 
                    className="pl-9 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring/50" 
                    defaultValue="user@example.com" 
                    disabled 
                  />
                </div>
              </div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="transition-all duration-200 hover:shadow-sm">Save Changes</Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <h2 className="text-xl font-semibold tracking-tight mb-4 text-destructive">Danger Zone</h2>
        <motion.div 
          className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 transition-all duration-200 hover:shadow-md hover:border-destructive/30"
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium text-destructive">Delete Account</Label>
              <p className="text-sm text-destructive/80">
                Permanently delete your account and all of your content.
              </p>
            </div>
            <Button variant="destructive">Delete Account</Button>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}


