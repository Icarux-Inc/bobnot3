"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";

export default function GeneralSettings() {
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
        <h2 className="text-xl font-semibold tracking-tight mb-4">Workspace</h2>
        <motion.div 
          className="grid gap-6 rounded-2xl border bg-card p-6 transition-all duration-200 hover:shadow-md hover:border-border/80"
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Workspace Name</Label>
              <p className="text-sm text-muted-foreground">
                The name of your workspace visible to your team.
              </p>
            </div>
          </div>
          <div className="flex gap-2 max-w-sm">
            <Input 
              defaultValue="My Workspace" 
              className="transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring/50"
            />
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="secondary" className="transition-all duration-200 hover:shadow-sm">Save</Button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <h2 className="text-xl font-semibold tracking-tight mb-4">Preferences</h2>
        <motion.div 
          className="grid gap-6 rounded-2xl border bg-card p-6 transition-all duration-200 hover:shadow-md hover:border-border/80"
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Language</Label>
              <p className="text-sm text-muted-foreground">
                Select your preferred language for the interface.
              </p>
            </div>
            <select className="h-9 w-[180px] rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-all duration-200 hover:border-input/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring cursor-pointer">
              <option>English (US)</option>
              <option>French</option>
              <option>Spanish</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Timezone</Label>
              <p className="text-sm text-muted-foreground">
                Set your local timezone for accurate timestamps.
              </p>
            </div>
            <select className="h-9 w-[180px] rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-all duration-200 hover:border-input/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring cursor-pointer">
              <option>UTC-08:00 (PST)</option>
              <option>UTC-05:00 (EST)</option>
              <option>UTC+00:00 (GMT)</option>
            </select>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}


