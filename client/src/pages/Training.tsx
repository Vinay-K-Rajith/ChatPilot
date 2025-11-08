import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Paper,
  Tab,
  Tabs,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Tooltip,
} from "@mui/material";
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
} from "@mui/icons-material";
import { safeFetch } from "@/utils/api";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`training-tabpanel-${index}`}
      aria-labelledby={`training-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface TrainingProgress {
  phone: string;
  name?: string;
  completedSections: number[];
  currentSection: number;
  lastUpdated: string;
  totalSections?: number;
}

interface TrainingSection {
  _id: string;
  s_no: number;
  heading: string;
  content: string;
}

interface KBFormData {
  s_no: number;
  heading: string;
  content: string;
}

export default function Training() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState<TrainingProgress[]>([]);
  const [kbData, setKbData] = useState<TrainingSection[]>([]);
  const [selectedKB, setSelectedKB] = useState<TrainingSection | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState<KBFormData>({
    s_no: 1,
    heading: "",
    content: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect dark mode and listen for changes
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    
    // Check initial state
    checkDarkMode();
    
    // Watch for changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    loadData();
  }, [tabValue]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (tabValue === 0) {
        // Load Training Progress
        await loadProgressData();
      } else {
        // Load Training KB
        await loadKBData();
      }
    } catch (err: any) {
      setError(err.message || "Failed to load data");
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadProgressData = async () => {
    // Get all leads with their training progress
    const leadsResponse = await safeFetch<any>("/api/leads?limit=1000");
    const leads = leadsResponse.leads || [];
    
    // Get training sections to calculate total
    const sectionsResponse = await safeFetch<any>("/api/training/sections");
    const totalSections = sectionsResponse.sections?.length || 0;
    
    // Create a map of phone to lead for quick lookup
    const leadMap = new Map(leads.map((lead: any) => [lead.phone, lead]));
    
    // For each lead with a phone, try to get their progress
    const progressPromises = leads
      .filter((lead: any) => lead.phone)
      .map(async (lead: any) => {
        try {
          const response = await safeFetch<any>(
            `/api/training/progress/${encodeURIComponent(lead.phone)}`
          );
          if (response.success && response.progress) {
            return {
              ...response.progress,
              name: lead.name || lead.firstName || 'Unknown',
              totalSections,
            };
          }
        } catch (err) {
          console.error(`Failed to load progress for ${lead.phone}:`, err);
        }
        return null;
      });
    
    const results = await Promise.all(progressPromises);
    // Filter to only show users who have completed at least one section
    const validProgress = results.filter(
      (p): p is TrainingProgress => 
        p !== null && p.completedSections.length > 0
    );
    setProgressData(validProgress);
  };

  const loadKBData = async () => {
    const response = await safeFetch<any>("/api/training/sections");
    if (response.success && response.sections) {
      setKbData(response.sections);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleView = (section: TrainingSection) => {
    setSelectedKB(section);
    setViewDialogOpen(true);
  };

  const handleEdit = (section: TrainingSection) => {
    setSelectedKB(section);
    setFormData({
      s_no: section.s_no,
      heading: section.heading,
      content: section.content,
    });
    setEditDialogOpen(true);
  };

  const handleAdd = () => {
    const nextSNo = kbData.length > 0 ? Math.max(...kbData.map(k => k.s_no)) + 1 : 1;
    setFormData({
      s_no: nextSNo,
      heading: "",
      content: "",
    });
    setAddDialogOpen(true);
  };

  const handleDelete = async (section: TrainingSection) => {
    if (!window.confirm(`Are you sure you want to delete "${section.heading}"?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/training/kb/${section._id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (response.ok) {
        await loadKBData();
      } else {
        throw new Error("Failed to delete section");
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete section");
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedKB) return;
    
    try {
      const response = await fetch(`/api/training/kb/${selectedKB._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        setEditDialogOpen(false);
        await loadKBData();
      } else {
        throw new Error("Failed to update section");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update section");
    }
  };

  const handleSaveAdd = async () => {
    try {
      const response = await fetch("/api/training/kb", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        setAddDialogOpen(false);
        await loadKBData();
      } else {
        throw new Error("Failed to add section");
      }
    } catch (err: any) {
      setError(err.message || "Failed to add section");
    }
  };

  const calculateProgress = (progress: TrainingProgress) => {
    const total = progress.totalSections || 10;
    const completed = progress.completedSections.length;
    return (completed / total) * 100;
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header with Hero Background */}
      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 2,
            mb: 3,
          }}
        >
          {/* Background Image */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              backgroundImage: 'url(https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1170&auto=format&fit=crop)',
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.15,
            }}
          />
          {/* Gradient Overlay */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg, rgba(30, 58, 95, 0.95) 0%, rgba(44, 95, 141, 0.90) 50%, rgba(74, 144, 191, 0.95) 100%)",
            }}
          />
          {/* Content */}
          <Box sx={{ position: "relative", p: 4, color: "white" }}>
            <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 1 }}>
              Training Management
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.85, fontSize: "0.95rem" }}>
              Monitor training progress and manage knowledge base content
            </Typography>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper 
          sx={{ 
            borderRadius: 2,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)",
            overflow: "hidden",
            bgcolor: isDarkMode ? "hsl(220, 20%, 12%)" : "white",
          }}
        >
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="training tabs"
            sx={{
              borderBottom: 1,
              borderColor: isDarkMode ? "hsl(220, 15%, 22%)" : "divider",
              px: 2,
              bgcolor: isDarkMode ? "hsl(220, 20%, 12%)" : "white",
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.95rem",
                minHeight: 64,
                color: isDarkMode ? "hsl(220, 10%, 95%)" : "inherit",
                "&.Mui-selected": {
                  color: isDarkMode ? "hsl(215, 75%, 55%)" : "inherit",
                },
              },
              "& .MuiTabs-indicator": {
                bgcolor: isDarkMode ? "hsl(215, 75%, 55%)" : "primary.main",
              },
            }}
          >
            <Tab label="Training Progress" id="training-tab-0" />
            <Tab label="Training Knowledge Base" id="training-tab-1" />
          </Tabs>

          {/* Training Progress Tab */}
          <TabPanel value={tabValue} index={0}>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress />
              </Box>
            ) : progressData.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No training progress data available
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Training progress will appear here once users start their training
                </Typography>
              </Box>
            ) : (
              <TableContainer sx={{ maxHeight: 600 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell 
                        sx={{ 
                          fontWeight: 700, 
                          bgcolor: isDarkMode ? "hsl(220, 15%, 18%)" : "grey.50",
                          color: isDarkMode ? "hsl(220, 10%, 95%)" : "inherit",
                          fontSize: "0.875rem",
                        }}
                      >
                        Name
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 700, 
                          bgcolor: isDarkMode ? "hsl(220, 15%, 18%)" : "grey.50",
                          color: isDarkMode ? "hsl(220, 10%, 95%)" : "inherit",
                          fontSize: "0.875rem",
                        }}
                      >
                        Phone
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 700, 
                          bgcolor: isDarkMode ? "hsl(220, 15%, 18%)" : "grey.50",
                          color: isDarkMode ? "hsl(220, 10%, 95%)" : "inherit",
                          fontSize: "0.875rem",
                        }}
                      >
                        Current Section
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 700, 
                          bgcolor: isDarkMode ? "hsl(220, 15%, 18%)" : "grey.50",
                          color: isDarkMode ? "hsl(220, 10%, 95%)" : "inherit",
                          fontSize: "0.875rem",
                        }}
                      >
                        Completed Sections
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 700, 
                          bgcolor: isDarkMode ? "hsl(220, 15%, 18%)" : "grey.50",
                          color: isDarkMode ? "hsl(220, 10%, 95%)" : "inherit",
                          fontSize: "0.875rem",
                        }}
                      >
                        Progress
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 700, 
                          bgcolor: isDarkMode ? "hsl(220, 15%, 18%)" : "grey.50",
                          color: isDarkMode ? "hsl(220, 10%, 95%)" : "inherit",
                          fontSize: "0.875rem",
                        }}
                      >
                        Last Updated
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {progressData.map((progress) => {
                      const progressPercent = calculateProgress(progress);
                      return (
                        <TableRow 
                          key={progress.phone} 
                          hover
                          sx={{
                            bgcolor: isDarkMode ? "hsl(220, 20%, 12%)" : "white",
                            "&:hover": {
                              bgcolor: isDarkMode ? "hsl(220, 15%, 18%)" : "action.hover",
                            },
                          }}
                        >
                          <TableCell sx={{ fontWeight: 600, color: isDarkMode ? "hsl(220, 10%, 95%)" : "inherit" }}>
                            {progress.name || 'Unknown'}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 500, color: isDarkMode ? "hsl(220, 10%, 65%)" : "text.secondary" }}>
                            {progress.phone}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={`Section ${progress.currentSection}`} 
                              color="primary" 
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                              {progress.completedSections.length > 0 ? (
                                progress.completedSections.map((sNo) => (
                                  <Chip
                                    key={sNo}
                                    icon={<CheckCircleIcon />}
                                    label={sNo}
                                    size="small"
                                    color="success"
                                    variant="outlined"
                                  />
                                ))
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  None
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                              <Box sx={{ flexGrow: 1, minWidth: 120 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={progressPercent}
                                  sx={{ 
                                    height: 10, 
                                    borderRadius: 2,
                                    bgcolor: isDarkMode ? "hsl(220, 15%, 22%)" : "grey.200",
                                    "& .MuiLinearProgress-bar": {
                                      borderRadius: 2,
                                      bgcolor: progressPercent === 100 ? "success.main" : (isDarkMode ? "hsl(215, 75%, 55%)" : "primary.main"),
                                    },
                                  }}
                                />
                              </Box>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 600,
                                  color: progressPercent === 100 ? "success.main" : "text.secondary",
                                  minWidth: 40,
                                  textAlign: "right",
                                }}
                              >
                                {progressPercent.toFixed(0)}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {new Date(progress.lastUpdated).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Training KB Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box 
              sx={{ 
                mb: 5, 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                flexWrap: "wrap",
                gap: 3,
                pb: 3,
                px: 4,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography 
                  variant="h4" 
                  fontWeight={600}
                  sx={{ 
                    color: "text.primary",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Knowledge Base Sections
                </Typography>
                <Chip
                  label={`${kbData.length} Section${kbData.length !== 1 ? 's' : ''}`}
                  size="small"
                  sx={{
                    bgcolor: isDarkMode ? "hsl(220, 15%, 18%)" : "grey.100",
                    color: isDarkMode ? "hsl(220, 10%, 65%)" : "text.secondary",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    height: 28,
                    borderRadius: 2,
                  }}
                />
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAdd}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  px: 3,
                  py: 1.2,
                  borderRadius: 2,
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  bgcolor: isDarkMode ? "hsl(215, 75%, 55%)" : "#1a1a1a",
                  color: "white",
                  "&:hover": {
                    bgcolor: isDarkMode ? "hsl(215, 75%, 65%)" : "#2a2a2a",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
                    transform: "translateY(-1px)",
                  },
                  transition: "all 0.2s ease-in-out",
                }}
              >
                Add Section
              </Button>
            </Box>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress />
              </Box>
            ) : kbData.length === 0 ? (
              <Box 
                sx={{ 
                  textAlign: "center", 
                  py: 12,
                  px: 4,
                  borderRadius: 3,
                  bgcolor: isDarkMode ? "hsl(220, 15%, 18%)" : "grey.50",
                  border: "2px dashed",
                  borderColor: isDarkMode ? "hsl(220, 15%, 22%)" : "grey.300",
                }}
              >
                <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      bgcolor: isDarkMode ? "hsl(220, 15%, 20%)" : "primary.lighter",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mx: "auto",
                      mb: 3,
                    }}
                  >
                    <AddIcon sx={{ fontSize: 40, color: isDarkMode ? "hsl(215, 75%, 55%)" : "primary.main" }} />
                </Box>
                <Typography variant="h5" fontWeight={600} sx={{ color: isDarkMode ? "hsl(220, 10%, 95%)" : "text.primary" }} gutterBottom>
                  No training sections yet
                </Typography>
                <Typography variant="body1" sx={{ color: isDarkMode ? "hsl(220, 10%, 65%)" : "text.secondary", mb: 4, maxWidth: 500, mx: "auto" }}>
                  Get started by creating your first training section. Build comprehensive training modules to onboard and educate your team.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<AddIcon />}
                  onClick={handleAdd}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    px: 4,
                    py: 1.5,
                    borderRadius: 2,
                  }}
                >
                  Create First Section
                </Button>
              </Box>
            ) : (
              <Grid container spacing={4} sx={{ px: 4 }}>
                {kbData.map((section, index) => (
                  <Grid item xs={12} sm={6} md={6} lg={4} xl={3} key={section._id}>
                    <Card
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        borderRadius: 3,
                        border: "1px solid",
                        borderColor: isDarkMode ? "hsl(220, 15%, 22%)" : "grey.100",
                        bgcolor: isDarkMode ? "hsl(220, 20%, 12%)" : (index % 3 === 0 ? "#fafbfc" : index % 3 === 1 ? "#f8f9fb" : "#f9fafb"),
                        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)",
                        overflow: "visible",
                        position: "relative",
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          top: 0,
                          left: 0,
                          bottom: 0,
                          width: 4,
                          background: "linear-gradient(180deg, #7fffd4 0%, #40e0d0 50%, #20b2aa 100%)",
                          borderTopLeftRadius: 12,
                          borderBottomLeftRadius: 12,
                        },
                        "&:hover": {
                          transform: "translateY(-6px)",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06)",
                          borderColor: isDarkMode ? "hsl(220, 15%, 35%)" : "grey.200",
                          bgcolor: isDarkMode ? "hsl(220, 18%, 16%)" : "white",
                          "& .action-buttons": {
                            opacity: 1,
                            transform: "translateX(0)",
                          },
                        },
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1, p: 4, pl: 4.5 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
                          <Chip 
                            label={`Section ${section.s_no}`} 
                            size="small"
                            sx={{ 
                              fontWeight: 600,
                              fontSize: "0.7rem",
                              bgcolor: isDarkMode ? "hsl(220, 15%, 20%)" : "rgba(0, 0, 0, 0.05)",
                              color: isDarkMode ? "hsl(220, 10%, 65%)" : "text.secondary",
                              height: 24,
                              borderRadius: 1.5,
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                              "& .MuiChip-label": {
                                px: 1.5,
                              },
                            }}
                          />
                          <Box 
                            className="action-buttons"
                            sx={{ 
                              display: "flex", 
                              gap: 1,
                              opacity: 0,
                              transform: "translateX(8px)",
                              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            }}
                          >
                            <Tooltip title="View" placement="top">
                              <IconButton
                                size="small"
                                onClick={() => handleView(section)}
                                sx={{ 
                                  width: 36,
                                  height: 36,
                                  color: isDarkMode ? "hsl(220, 10%, 65%)" : "grey.600",
                                  bgcolor: isDarkMode ? "hsl(220, 15%, 20%)" : "white",
                                  border: "1px solid",
                                  borderColor: isDarkMode ? "hsl(220, 15%, 22%)" : "grey.200",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                                  "&:hover": { 
                                    bgcolor: isDarkMode ? "hsl(220, 15%, 25%)" : "grey.50",
                                    borderColor: isDarkMode ? "hsl(220, 15%, 35%)" : "grey.300",
                                    color: isDarkMode ? "hsl(215, 75%, 55%)" : "primary.main",
                                    transform: "scale(1.05)",
                                  },
                                  transition: "all 0.2s ease",
                                }}
                              >
                                <ViewIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit" placement="top">
                              <IconButton
                                size="small"
                                onClick={() => handleEdit(section)}
                                sx={{ 
                                  width: 36,
                                  height: 36,
                                  color: isDarkMode ? "hsl(220, 10%, 65%)" : "grey.600",
                                  bgcolor: isDarkMode ? "hsl(220, 15%, 20%)" : "white",
                                  border: "1px solid",
                                  borderColor: isDarkMode ? "hsl(220, 15%, 22%)" : "grey.200",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                                  "&:hover": { 
                                    bgcolor: isDarkMode ? "hsl(220, 15%, 25%)" : "grey.50",
                                    borderColor: isDarkMode ? "hsl(220, 15%, 35%)" : "grey.300",
                                    color: isDarkMode ? "hsl(215, 75%, 55%)" : "info.main",
                                    transform: "scale(1.05)",
                                  },
                                  transition: "all 0.2s ease",
                                }}
                              >
                                <EditIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete" placement="top">
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(section)}
                                sx={{ 
                                  width: 36,
                                  height: 36,
                                  color: isDarkMode ? "hsl(220, 10%, 65%)" : "grey.500",
                                  bgcolor: isDarkMode ? "hsl(220, 15%, 20%)" : "white",
                                  border: "1px solid",
                                  borderColor: isDarkMode ? "hsl(220, 15%, 22%)" : "grey.200",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                                  "&:hover": { 
                                    bgcolor: isDarkMode ? "hsl(0, 40%, 20%)" : "#fef2f2",
                                    borderColor: isDarkMode ? "hsl(0, 50%, 30%)" : "#fecaca",
                                    color: "#dc2626",
                                    transform: "scale(1.05)",
                                  },
                                  transition: "all 0.2s ease",
                                }}
                              >
                                <DeleteIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                        <Typography 
                          variant="h6" 
                          sx={{
                            fontWeight: 600,
                            fontSize: "1.25rem",
                            lineHeight: 1.3,
                            mb: 2,
                            color: isDarkMode ? "hsl(220, 10%, 95%)" : "#1a1a1a",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            minHeight: 65,
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {section.heading}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: isDarkMode ? "hsl(220, 10%, 65%)" : "grey.600",
                            lineHeight: 1.7,
                            fontSize: "0.9rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            minHeight: 51,
                          }}
                        >
                          {section.content}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </TabPanel>
        </Paper>
      </Box>

      {/* View Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            bgcolor: isDarkMode ? "hsl(220, 18%, 16%)" : "white",
            color: isDarkMode ? "hsl(220, 10%, 95%)" : "inherit",
          },
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          {selectedKB && (
            <Box>
              <Chip 
                label={`Section ${selectedKB.s_no}`} 
                size="small" 
                color="primary"
                sx={{ mb: 1.5, fontWeight: 600 }} 
              />
              <Typography variant="h5" fontWeight={600} sx={{ color: isDarkMode ? "hsl(220, 10%, 95%)" : "inherit" }}>
                {selectedKB.heading}
              </Typography>
            </Box>
          )}
        </DialogTitle>
        <DialogContent dividers sx={{ py: 3 }}>
          {selectedKB && (
            <Typography 
              variant="body1" 
              sx={{ 
                whiteSpace: "pre-wrap",
                lineHeight: 1.7,
                color: isDarkMode ? "hsl(220, 10%, 95%)" : "text.primary",
              }}
            >
              {selectedKB.content}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={() => setViewDialogOpen(false)}
            variant="contained"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            bgcolor: isDarkMode ? "hsl(220, 18%, 16%)" : "white",
          },
        }}
      >
        <DialogTitle 
          sx={{ 
            fontWeight: 700, 
            fontSize: "1.5rem",
            pb: 1,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            letterSpacing: "-0.02em",
          }}
        >
          Edit Training Section
        </DialogTitle>
        <DialogContent 
          dividers 
          sx={{ 
            bgcolor: isDarkMode ? "hsl(220, 20%, 12%)" : "#fafbfc",
            borderColor: isDarkMode ? "hsl(220, 15%, 22%)" : "divider",
            py: 4,
            px: 4,
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Section Number & Heading Row */}
            <Box 
              sx={{ 
                display: "grid", 
                gridTemplateColumns: { xs: "1fr", sm: "180px 1fr" },
                gap: 3,
              }}
            >
              <Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 600, 
                    mb: 1, 
                    color: isDarkMode ? "hsl(220, 10%, 75%)" : "#475569",
                    fontSize: "0.875rem",
                  }}
                >
                  Section Number <span style={{ color: "#ef4444" }}>*</span>
                </Typography>
                <TextField
                  type="number"
                  value={formData.s_no}
                  onChange={(e) => setFormData({ ...formData, s_no: parseInt(e.target.value) || 1 })}
                  fullWidth
                  placeholder="1"
                  InputProps={{
                    sx: {
                      bgcolor: isDarkMode ? "hsl(220, 15%, 18%)" : "white",
                      color: isDarkMode ? "hsl(220, 10%, 95%)" : "inherit",
                      borderRadius: 2,
                      "& fieldset": { borderColor: isDarkMode ? "hsl(220, 15%, 22%)" : "#e2e8f0" },
                      "&:hover fieldset": { borderColor: isDarkMode ? "hsl(220, 15%, 35%)" : "#cbd5e1" },
                      "&.Mui-focused fieldset": { 
                        borderColor: isDarkMode ? "hsl(215, 75%, 55%)" : "#667eea",
                        borderWidth: 2,
                      },
                      "&.Mui-focused": {
                        boxShadow: isDarkMode ? "0 0 0 3px rgba(96, 165, 250, 0.2)" : "0 0 0 3px rgba(102, 126, 234, 0.1)",
                      },
                    },
                  }}
                />
              </Box>
              <Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 600, 
                    mb: 1, 
                    color: isDarkMode ? "hsl(220, 10%, 75%)" : "#475569",
                    fontSize: "0.875rem",
                  }}
                >
                  Heading <span style={{ color: "#ef4444" }}>*</span>
                </Typography>
                <TextField
                  value={formData.heading}
                  onChange={(e) => setFormData({ ...formData, heading: e.target.value })}
                  fullWidth
                  required
                  placeholder="Enter section heading"
                  InputProps={{
                    sx: {
                      bgcolor: isDarkMode ? "hsl(220, 15%, 18%)" : "white",
                      color: isDarkMode ? "hsl(220, 10%, 95%)" : "inherit",
                      borderRadius: 2,
                      "& fieldset": { borderColor: isDarkMode ? "hsl(220, 15%, 22%)" : "#e2e8f0" },
                      "&:hover fieldset": { borderColor: isDarkMode ? "hsl(220, 15%, 35%)" : "#cbd5e1" },
                      "&.Mui-focused fieldset": { 
                        borderColor: isDarkMode ? "hsl(215, 75%, 55%)" : "#667eea",
                        borderWidth: 2,
                      },
                      "&.Mui-focused": {
                        boxShadow: isDarkMode ? "0 0 0 3px rgba(96, 165, 250, 0.2)" : "0 0 0 3px rgba(102, 126, 234, 0.1)",
                      },
                    },
                  }}
                />
              </Box>
            </Box>

            {/* Divider */}
            <Box sx={{ borderBottom: "2px solid #e2e8f0", my: 1 }} />

            {/* Content Field */}
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 600, 
                    color: isDarkMode ? "hsl(220, 10%, 75%)" : "#475569",
                    fontSize: "0.875rem",
                  }}
                >
                  Content <span style={{ color: "#ef4444" }}>*</span>
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ color: isDarkMode ? "hsl(220, 10%, 65%)" : "#94a3b8", fontSize: "0.75rem" }}
                >
                  {formData.content.length} characters
                </Typography>
              </Box>
              <TextField
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                fullWidth
                multiline
                rows={12}
                required
                placeholder="Enter detailed content for this training section..."
                InputProps={{
                  sx: {
                    bgcolor: isDarkMode ? "hsl(220, 15%, 18%)" : "white",
                    color: isDarkMode ? "hsl(220, 10%, 95%)" : "inherit",
                    borderRadius: 2,
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    lineHeight: 1.7,
                    "& fieldset": { borderColor: isDarkMode ? "hsl(220, 15%, 22%)" : "#e2e8f0" },
                    "&:hover fieldset": { borderColor: isDarkMode ? "hsl(220, 15%, 35%)" : "#cbd5e1" },
                    "&.Mui-focused fieldset": { 
                      borderColor: isDarkMode ? "hsl(215, 75%, 55%)" : "#667eea",
                      borderWidth: 2,
                    },
                    "&.Mui-focused": {
                      boxShadow: isDarkMode ? "0 0 0 3px rgba(96, 165, 250, 0.2)" : "0 0 0 3px rgba(102, 126, 234, 0.1)",
                    },
                    "& textarea": {
                      resize: "vertical",
                    },
                  },
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions 
          sx={{ 
            px: 4, 
            py: 3, 
            gap: 2,
            bgcolor: isDarkMode ? "hsl(220, 15%, 18%)" : "#f8fafc",
            borderTop: isDarkMode ? "1px solid hsl(220, 15%, 22%)" : "1px solid #e2e8f0",
          }}
        >
          <Button 
            onClick={() => setEditDialogOpen(false)}
            variant="outlined"
            sx={{
              textTransform: "none",
              fontWeight: 600,
              px: 3,
              py: 1,
              borderRadius: 2,
              borderColor: isDarkMode ? "hsl(220, 15%, 35%)" : "#cbd5e1",
              color: isDarkMode ? "hsl(220, 10%, 75%)" : "#64748b",
              "&:hover": {
                bgcolor: isDarkMode ? "hsl(220, 15%, 20%)" : "#f1f5f9",
                borderColor: isDarkMode ? "hsl(220, 15%, 45%)" : "#94a3b8",
              },
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveEdit} 
            variant="contained" 
            startIcon={<CheckCircleIcon />}
            sx={{ 
              minWidth: 140,
              textTransform: "none",
              fontWeight: 600,
              px: 3,
              py: 1,
              borderRadius: 2,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #5568d3 0%, #65408b 100%)",
                boxShadow: "0 6px 16px rgba(102, 126, 234, 0.4)",
                transform: "translateY(-1px)",
              },
              transition: "all 0.2s ease",
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            bgcolor: isDarkMode ? "hsl(220, 18%, 16%)" : "white",
          },
        }}
      >
        <DialogTitle 
          sx={{ 
            fontWeight: 700, 
            fontSize: "1.5rem",
            pb: 1,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            letterSpacing: "-0.02em",
          }}
        >
          Add Training Section
        </DialogTitle>
        <DialogContent 
          dividers 
          sx={{ 
            bgcolor: isDarkMode ? "hsl(220, 20%, 12%)" : "#fafbfc",
            borderColor: isDarkMode ? "hsl(220, 15%, 22%)" : "divider",
            py: 4,
            px: 4,
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Section Number & Heading Row */}
            <Box 
              sx={{ 
                display: "grid", 
                gridTemplateColumns: { xs: "1fr", sm: "180px 1fr" },
                gap: 3,
              }}
            >
              <Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 600, 
                    mb: 1, 
                    color: isDarkMode ? "hsl(220, 10%, 75%)" : "#475569",
                    fontSize: "0.875rem",
                  }}
                >
                  Section Number <span style={{ color: "#ef4444" }}>*</span>
                </Typography>
                <TextField
                  type="number"
                  value={formData.s_no}
                  onChange={(e) => setFormData({ ...formData, s_no: parseInt(e.target.value) || 1 })}
                  fullWidth
                  placeholder="1"
                  InputProps={{
                    sx: {
                      bgcolor: isDarkMode ? "hsl(220, 15%, 18%)" : "white",
                      color: isDarkMode ? "hsl(220, 10%, 95%)" : "inherit",
                      borderRadius: 2,
                      "& fieldset": { borderColor: isDarkMode ? "hsl(220, 15%, 22%)" : "#e2e8f0" },
                      "&:hover fieldset": { borderColor: isDarkMode ? "hsl(220, 15%, 35%)" : "#cbd5e1" },
                      "&.Mui-focused fieldset": { 
                        borderColor: isDarkMode ? "hsl(215, 75%, 55%)" : "#667eea",
                        borderWidth: 2,
                      },
                      "&.Mui-focused": {
                        boxShadow: isDarkMode ? "0 0 0 3px rgba(96, 165, 250, 0.2)" : "0 0 0 3px rgba(102, 126, 234, 0.1)",
                      },
                    },
                  }}
                />
              </Box>
              <Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 600, 
                    mb: 1, 
                    color: isDarkMode ? "hsl(220, 10%, 75%)" : "#475569",
                    fontSize: "0.875rem",
                  }}
                >
                  Heading <span style={{ color: "#ef4444" }}>*</span>
                </Typography>
                <TextField
                  value={formData.heading}
                  onChange={(e) => setFormData({ ...formData, heading: e.target.value })}
                  fullWidth
                  required
                  placeholder="Enter section heading"
                  InputProps={{
                    sx: {
                      bgcolor: isDarkMode ? "hsl(220, 15%, 18%)" : "white",
                      color: isDarkMode ? "hsl(220, 10%, 95%)" : "inherit",
                      borderRadius: 2,
                      "& fieldset": { borderColor: isDarkMode ? "hsl(220, 15%, 22%)" : "#e2e8f0" },
                      "&:hover fieldset": { borderColor: isDarkMode ? "hsl(220, 15%, 35%)" : "#cbd5e1" },
                      "&.Mui-focused fieldset": { 
                        borderColor: isDarkMode ? "hsl(215, 75%, 55%)" : "#667eea",
                        borderWidth: 2,
                      },
                      "&.Mui-focused": {
                        boxShadow: isDarkMode ? "0 0 0 3px rgba(96, 165, 250, 0.2)" : "0 0 0 3px rgba(102, 126, 234, 0.1)",
                      },
                    },
                  }}
                />
              </Box>
            </Box>

            {/* Divider */}
            <Box sx={{ borderBottom: "2px solid #e2e8f0", my: 1 }} />

            {/* Content Field */}
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 600, 
                    color: isDarkMode ? "hsl(220, 10%, 75%)" : "#475569",
                    fontSize: "0.875rem",
                  }}
                >
                  Content <span style={{ color: "#ef4444" }}>*</span>
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ color: isDarkMode ? "hsl(220, 10%, 65%)" : "#94a3b8", fontSize: "0.75rem" }}
                >
                  {formData.content.length} characters
                </Typography>
              </Box>
              <TextField
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                fullWidth
                multiline
                rows={12}
                required
                placeholder="Enter detailed content for this training section..."
                InputProps={{
                  sx: {
                    bgcolor: isDarkMode ? "hsl(220, 15%, 18%)" : "white",
                    color: isDarkMode ? "hsl(220, 10%, 95%)" : "inherit",
                    borderRadius: 2,
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    lineHeight: 1.7,
                    "& fieldset": { borderColor: isDarkMode ? "hsl(220, 15%, 22%)" : "#e2e8f0" },
                    "&:hover fieldset": { borderColor: isDarkMode ? "hsl(220, 15%, 35%)" : "#cbd5e1" },
                    "&.Mui-focused fieldset": { 
                      borderColor: isDarkMode ? "hsl(215, 75%, 55%)" : "#667eea",
                      borderWidth: 2,
                    },
                    "&.Mui-focused": {
                      boxShadow: isDarkMode ? "0 0 0 3px rgba(96, 165, 250, 0.2)" : "0 0 0 3px rgba(102, 126, 234, 0.1)",
                    },
                    "& textarea": {
                      resize: "vertical",
                    },
                  },
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions 
          sx={{ 
            px: 4, 
            py: 3, 
            gap: 2,
            bgcolor: isDarkMode ? "hsl(220, 15%, 18%)" : "#f8fafc",
            borderTop: isDarkMode ? "1px solid hsl(220, 15%, 22%)" : "1px solid #e2e8f0",
          }}
        >
          <Button 
            onClick={() => setAddDialogOpen(false)}
            variant="outlined"
            sx={{
              textTransform: "none",
              fontWeight: 600,
              px: 3,
              py: 1,
              borderRadius: 2,
              borderColor: isDarkMode ? "hsl(220, 15%, 35%)" : "#cbd5e1",
              color: isDarkMode ? "hsl(220, 10%, 75%)" : "#64748b",
              "&:hover": {
                bgcolor: isDarkMode ? "hsl(220, 15%, 20%)" : "#f1f5f9",
                borderColor: isDarkMode ? "hsl(220, 15%, 45%)" : "#94a3b8",
              },
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveAdd} 
            variant="contained" 
            startIcon={<AddIcon />}
            sx={{ 
              minWidth: 140,
              textTransform: "none",
              fontWeight: 600,
              px: 3,
              py: 1,
              borderRadius: 2,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #5568d3 0%, #65408b 100%)",
                boxShadow: "0 6px 16px rgba(102, 126, 234, 0.4)",
                transform: "translateY(-1px)",
              },
              transition: "all 0.2s ease",
            }}
          >
            Add Section
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
