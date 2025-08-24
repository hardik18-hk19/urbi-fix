import axios from "axios";
import { useUserStore } from "../store/userStore";
import type {
  ApiResponse,
  LoginResponse,
  User,
  Issue,
  Service,
  Booking,
  PaginationParams,
  Comment,
  CrowdfundingDetails,
  CrowdfundingTransaction,
} from "../types";

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for adding auth tokens
api.interceptors.request.use(
  (config) => {
    // Get token from Zustand store or fallback to localStorage
    const storeToken = useUserStore.getState().token;
    const localToken =
      typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

    const token = storeToken || localToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common HTTP error statuses
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      const { clearAuth } = useUserStore.getState();
      clearAuth();

      if (typeof window !== "undefined") {
        localStorage.removeItem("authToken");
        // You can add redirect logic here
        // window.location.href = '/login';
      }
    }

    if (error.response?.status === 403) {
      // Forbidden - user doesn't have permission
      console.error("Access forbidden");
    }

    if (error.response?.status >= 500) {
      // Server error
      console.error("Server error:", error.response.data);
    }

    return Promise.reject(error);
  }
);

// Authentication API functions
export const authAPI = {
  // Register user
  register: async (userData: {
    name: string;
    email: string;
    password: string;
    phone: string;
    role: string;
    adminKey?: string;
  }): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>(
      "/api/auth/register",
      userData
    );
    return response.data;
  },

  // Login user
  login: async (credentials: {
    email: string;
    password: string;
  }): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>(
      "/api/auth/login",
      credentials
    );
    return response.data;
  },

  // Logout user (client-side cleanup)
  logout: () => {
    const { clearAuth } = useUserStore.getState();
    clearAuth();

    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user-storage");
    }
  },

  // Get current user profile
  getMe: async (): Promise<ApiResponse<User>> => {
    const response = await api.get<ApiResponse<User>>("/api/auth/me");
    return response.data;
  },

  // Update user profile
  updateProfile: async (profileData: {
    name?: string;
    phone?: string;
  }): Promise<ApiResponse<User>> => {
    const response = await api.put<ApiResponse<User>>(
      "/api/auth/update-profile",
      profileData
    );
    return response.data;
  },
};

// Dashboard API functions
export const dashboardAPI = {
  // Get dashboard statistics
  getStats: async (): Promise<{
    issuesCount: number;
    bookingsCount: number;
    pendingIssues: number;
    completedBookings: number;
  }> => {
    try {
      const [issuesResponse, bookingsResponse] = await Promise.all([
        api.get<ApiResponse<Issue[]>>("/api/issues"),
        api.get<ApiResponse<Booking[]>>("/api/consumer/bookings"),
      ]);

      const issues = issuesResponse.data.data || [];
      const bookings = bookingsResponse.data.data || [];

      // Calculate stats
      const pendingIssues = issues.filter(
        (issue) => issue.status === "open" || issue.status === "in_progress"
      ).length;

      const completedBookings = bookings.filter(
        (booking) => booking.status === "completed"
      ).length;

      return {
        issuesCount: issues.length,
        bookingsCount: bookings.length,
        pendingIssues,
        completedBookings,
      };
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      throw error;
    }
  },

  // Get admin dashboard statistics
  getAdminStats: async (): Promise<{
    totalUsers: number;
    totalConsumers: number;
    totalProviders: number;
    verifiedProviders: number;
    totalIssues: number;
    openIssues: number;
    inProgressIssues: number;
    resolvedIssues: number;
  }> => {
    try {
      const [issuesResponse, providersResponse, consumersResponse] =
        await Promise.all([
          api.get<ApiResponse<Issue[]>>("/api/issues"),
          api.get<ApiResponse<User[]>>("/api/provider"),
          api.get<ApiResponse<User[]>>("/api/consumer"),
        ]);

      const issues = issuesResponse.data.data || [];
      const providers = providersResponse.data.data || [];
      const consumers = consumersResponse.data.data || [];

      const openIssues = issues.filter(
        (issue) => issue.status === "open"
      ).length;
      const inProgressIssues = issues.filter(
        (issue) => issue.status === "in_progress"
      ).length;
      const resolvedIssues = issues.filter(
        (issue) => issue.status === "resolved"
      ).length;
      const verifiedProviders = providers.filter(
        (provider) => provider.providerDetails?.verified === true
      ).length;

      return {
        totalUsers: providers.length + consumers.length,
        totalConsumers: consumers.length,
        totalProviders: providers.length,
        verifiedProviders,
        totalIssues: issues.length,
        openIssues,
        inProgressIssues,
        resolvedIssues,
      };
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      throw error;
    }
  },

  // Get provider dashboard statistics
  getProviderStats: async (): Promise<{
    totalBookings: number;
    completedBookings: number;
    pendingBookings: number;
    cancelledBookings: number;
    totalEarnings: number;
    thisMonthEarnings: number;
    averageRating: number;
    completionRate: number;
  }> => {
    try {
      // Try to get provider bookings and statistics
      const [bookingsResponse] = await Promise.all([
        api.get<ApiResponse<Booking[]>>("/api/provider/bookings"),
      ]);

      const bookings = bookingsResponse.data.data || [];
      const completed = bookings.filter(
        (booking) => booking.status === "completed"
      );
      const pending = bookings.filter(
        (booking) =>
          booking.status === "pending" || booking.status === "in_progress"
      );
      const cancelled = bookings.filter(
        (booking) => booking.status === "cancelled"
      );

      const totalEarnings = completed.reduce(
        (sum, booking) => sum + (booking.finalCost || 0),
        0
      );

      // Calculate this month's earnings
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonthBookings = completed.filter((booking) => {
        const bookingDate = new Date(booking.updatedAt);
        return (
          bookingDate.getMonth() === currentMonth &&
          bookingDate.getFullYear() === currentYear
        );
      });
      const thisMonthEarnings = thisMonthBookings.reduce(
        (sum, booking) => sum + (booking.finalCost || 0),
        0
      );

      // Calculate average rating
      const ratingsSum = completed.reduce(
        (sum, booking) => sum + (booking.rating || 0),
        0
      );
      const averageRating =
        completed.length > 0 ? ratingsSum / completed.length : 0;

      const completionRate =
        bookings.length > 0 ? (completed.length / bookings.length) * 100 : 0;

      return {
        totalBookings: bookings.length,
        completedBookings: completed.length,
        pendingBookings: pending.length,
        cancelledBookings: cancelled.length,
        totalEarnings,
        thisMonthEarnings,
        averageRating,
        completionRate,
      };
    } catch (error) {
      console.error("Error fetching provider stats:", error);
      // Return default values if the endpoint fails
      return {
        totalBookings: 0,
        completedBookings: 0,
        pendingBookings: 0,
        cancelledBookings: 0,
        totalEarnings: 0,
        thisMonthEarnings: 0,
        averageRating: 0,
        completionRate: 0,
      };
    }
  },

  // Get consumer dashboard statistics
  getConsumerStats: async (): Promise<{
    totalIssues: number;
    openIssues: number;
    inProgressIssues: number;
    resolvedIssues: number;
    totalBookings: number;
    completedBookings: number;
    pendingBookings: number;
    totalSpent: number;
    thisMonthSpent: number;
    averageRating: number;
  }> => {
    try {
      const [issuesResponse, bookingsResponse] = await Promise.all([
        api.get<ApiResponse<Issue[]>>("/api/issues"),
        api.get<ApiResponse<Booking[]>>("/api/consumer/bookings"),
      ]);

      const issues = issuesResponse.data.data || [];
      const bookings = bookingsResponse.data.data || [];

      // Calculate issue stats
      const openIssues = issues.filter(
        (issue) => issue.status === "open"
      ).length;
      const inProgressIssues = issues.filter(
        (issue) => issue.status === "in_progress"
      ).length;
      const resolvedIssues = issues.filter(
        (issue) => issue.status === "resolved"
      ).length;

      // Calculate booking stats
      const completed = bookings.filter(
        (booking) => booking.status === "completed"
      );
      const pending = bookings.filter(
        (booking) =>
          booking.status === "pending" || booking.status === "in_progress"
      );

      // Calculate spending
      const totalSpent = completed.reduce(
        (sum, booking) =>
          sum + (booking.finalCost || booking.estimatedCost || 0),
        0
      );

      // Calculate this month's spending
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonthBookings = completed.filter((booking) => {
        const bookingDate = new Date(booking.updatedAt);
        return (
          bookingDate.getMonth() === currentMonth &&
          bookingDate.getFullYear() === currentYear
        );
      });
      const thisMonthSpent = thisMonthBookings.reduce(
        (sum, booking) =>
          sum + (booking.finalCost || booking.estimatedCost || 0),
        0
      );

      // Calculate average rating given by consumer
      const ratingsGiven = completed.filter(
        (booking) => booking.rating && booking.rating > 0
      );
      const averageRating =
        ratingsGiven.length > 0
          ? ratingsGiven.reduce(
              (sum, booking) => sum + (booking.rating || 0),
              0
            ) / ratingsGiven.length
          : 0;

      return {
        totalIssues: issues.length,
        openIssues,
        inProgressIssues,
        resolvedIssues,
        totalBookings: bookings.length,
        completedBookings: completed.length,
        pendingBookings: pending.length,
        totalSpent,
        thisMonthSpent,
        averageRating,
      };
    } catch (error) {
      console.error("Error fetching consumer stats:", error);
      throw error;
    }
  },

  // Get issues
  getIssues: async (
    params?: PaginationParams
  ): Promise<ApiResponse<Issue[]>> => {
    const response = await api.get<ApiResponse<Issue[]>>("/api/issues", {
      params,
    });
    return response.data;
  },

  // Get bookings
  getBookings: async (
    params?: PaginationParams
  ): Promise<ApiResponse<Booking[]>> => {
    const response = await api.get<ApiResponse<Booking[]>>(
      "/api/consumer/bookings",
      {
        params,
      }
    );
    return response.data;
  },
};

// Booking API functions
export const bookingAPI = {
  // Create a new booking
  createBooking: async (bookingData: {
    issue?: string;
    provider?: string;
    service: string;
    scheduledDate?: string;
    totalAmount?: number;
    notes?: string;
  }): Promise<ApiResponse<Booking>> => {
    const response = await api.post<ApiResponse<Booking>>(
      "/api/bookings",
      bookingData
    );
    return response.data;
  },

  // Get all bookings
  getBookings: async (
    params?: PaginationParams
  ): Promise<ApiResponse<Booking[]>> => {
    const response = await api.get<ApiResponse<Booking[]>>("/api/bookings", {
      params,
    });
    return response.data;
  },

  // Get booking by ID
  getBookingById: async (id: string): Promise<ApiResponse<Booking>> => {
    const response = await api.get<ApiResponse<Booking>>(`/api/bookings/${id}`);
    return response.data;
  },

  // Update booking
  updateBooking: async (
    id: string,
    updateData: Partial<Booking>
  ): Promise<ApiResponse<Booking>> => {
    const response = await api.patch<ApiResponse<Booking>>(
      `/api/bookings/${id}`,
      updateData
    );
    return response.data;
  },

  // Delete booking
  deleteBooking: async (id: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/api/bookings/${id}`);
    return response.data;
  },
};

// Issues API functions
export const issuesAPI = {
  // Get all issues with pagination
  getIssues: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    crowdfunding?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<{
    success: boolean;
    data: Issue[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> => {
    const response = await api.get<{
      success: boolean;
      data: Issue[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      };
    }>("/api/issues", { params });
    return response.data;
  },

  // Get issue by ID
  getIssueById: async (id: string): Promise<ApiResponse<Issue>> => {
    const response = await api.get<ApiResponse<Issue>>(`/api/issues/${id}`);
    return response.data;
  },

  // Create new issue
  createIssue: async (issueData: {
    title: string;
    description: string;
    category: string;
    location: {
      address: string;
      coordinates: {
        latitude: number;
        longitude: number;
      };
    };
    priority?: string;
    images?: string[];
    estimatedCost?: number;
  }): Promise<ApiResponse<Issue>> => {
    const response = await api.post<ApiResponse<Issue>>(
      "/api/issues",
      issueData
    );
    return response.data;
  },

  // Update issue
  updateIssue: async (
    id: string,
    updateData: Partial<Issue>
  ): Promise<ApiResponse<Issue>> => {
    const response = await api.put<ApiResponse<Issue>>(
      `/api/issues/${id}`,
      updateData
    );
    return response.data;
  },

  // Delete issue
  deleteIssue: async (id: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/api/issues/${id}`);
    return response.data;
  },

  // Upvote/downvote issue
  upvoteIssue: async (
    id: string
  ): Promise<{
    success: boolean;
    message: string;
    data: {
      upvotes: number;
      hasUpvoted: boolean;
    };
  }> => {
    const response = await api.patch<{
      success: boolean;
      message: string;
      data: {
        upvotes: number;
        hasUpvoted: boolean;
      };
    }>(`/api/issues/${id}/upvote`);
    return response.data;
  },

  // Track issue view
  trackView: async (
    id: string
  ): Promise<{
    success: boolean;
    data: {
      viewsCount: number;
    };
  }> => {
    const response = await api.post<{
      success: boolean;
      data: {
        viewsCount: number;
      };
    }>(`/api/issues/${id}/view`);
    return response.data;
  },

  // Enable crowdfunding for an issue - UPDATED
  enableCrowdfunding: async (
    id: string,
    data: {
      targetAmount: number;
      deadline?: string;
    }
  ): Promise<ApiResponse<Issue>> => {
    const response = await api.post<ApiResponse<Issue>>(
      `/api/issues/${id}/crowdfunding/enable`,
      data
    );
    return response.data;
  },

  // Disable crowdfunding for an issue - UPDATED
  disableCrowdfunding: async (id: string): Promise<ApiResponse<Issue>> => {
    const response = await api.post<ApiResponse<Issue>>(
      `/api/issues/${id}/crowdfunding/disable`
    );
    return response.data;
  },
};

// Comments API functions
export const commentsAPI = {
  // Get comments for an issue
  getCommentsByIssue: async (
    issueId: string,
    params?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{
    success: boolean;
    data: Comment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> => {
    const response = await api.get<{
      success: boolean;
      data: Comment[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      };
    }>(`/api/comments/issue/${issueId}`, { params });
    return response.data;
  },

  // Create a comment
  createComment: async (
    issueId: string,
    data: {
      content: string;
      parentComment?: string;
      estimatedCost?: number;
      estimatedTime?: string;
    }
  ): Promise<{
    success: boolean;
    data: Comment;
    message: string;
  }> => {
    const response = await api.post<{
      success: boolean;
      data: Comment;
      message: string;
    }>(`/api/comments/issue/${issueId}`, data);
    return response.data;
  },

  // Update a comment
  updateComment: async (
    commentId: string,
    data: { content: string }
  ): Promise<{
    success: boolean;
    data: Comment;
    message: string;
  }> => {
    const response = await api.put<{
      success: boolean;
      data: Comment;
      message: string;
    }>(`/api/comments/${commentId}`, data);
    return response.data;
  },

  // Delete a comment
  deleteComment: async (
    commentId: string
  ): Promise<{
    success: boolean;
    message: string;
  }> => {
    const response = await api.delete<{
      success: boolean;
      message: string;
    }>(`/api/comments/${commentId}`);
    return response.data;
  },

  // Vote on a comment
  voteComment: async (
    commentId: string,
    voteType: "upvote" | "downvote"
  ): Promise<{
    success: boolean;
    data: {
      upvotes: number;
      downvotes: number;
      hasUpvoted: boolean;
      hasDownvoted: boolean;
    };
    message: string;
  }> => {
    const response = await api.patch<{
      success: boolean;
      data: {
        upvotes: number;
        downvotes: number;
        hasUpvoted: boolean;
        hasDownvoted: boolean;
      };
      message: string;
    }>(`/api/comments/${commentId}/vote`, { voteType });
    return response.data;
  },

  // Mark comment as solution
  markAsSolution: async (
    commentId: string
  ): Promise<{
    success: boolean;
    message: string;
  }> => {
    const response = await api.patch<{
      success: boolean;
      message: string;
    }>(`/api/comments/${commentId}/mark-solution`);
    return response.data;
  },
};

// Crowdfunding API functions
export const crowdfundingAPI = {
  // Get crowdfunding details for an issue
  getCrowdfundingDetails: async (
    issueId: string
  ): Promise<{
    success: boolean;
    data: CrowdfundingDetails;
  }> => {
    const response = await api.get<{
      success: boolean;
      data: CrowdfundingDetails;
    }>(`/api/crowdfunding/issue/${issueId}`);
    return response.data;
  },

  // Enable crowdfunding for an issue
  enableCrowdfunding: async (
    issueId: string,
    data: {
      targetAmount: number;
      deadline?: string;
    }
  ): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> => {
    const response = await api.post<{
      success: boolean;
      data: any;
      message: string;
    }>(`/api/crowdfunding/issue/${issueId}/enable`, data);
    return response.data;
  },

  // Contribute to crowdfunding
  contributeToCrowdfunding: async (
    issueId: string,
    data: {
      amount: number;
      paymentMethod: string;
      isAnonymous?: boolean;
      message?: string;
      transactionId: string;
    }
  ): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> => {
    const response = await api.post<{
      success: boolean;
      data: any;
      message: string;
    }>(`/api/crowdfunding/issue/${issueId}/contribute`, data);
    return response.data;
  },

  // Get user's contribution history
  getUserContributions: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    data: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> => {
    const response = await api.get<{
      success: boolean;
      data: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      };
    }>("/api/crowdfunding/my-contributions", { params });
    return response.data;
  },

  // Close crowdfunding and assign provider (admin only)
  closeCrowdfundingAndAssign: async (
    issueId: string,
    data: { providerId: string }
  ): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> => {
    const response = await api.post<{
      success: boolean;
      data: any;
      message: string;
    }>(`/api/crowdfunding/issue/${issueId}/close`, data);
    return response.data;
  },
};

// Services API functions
export const servicesAPI = {
  // Get all services with filtering
  getServices: async (params?: {
    category?: string;
    provider?: string;
    available?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<ApiResponse<Service[]>> => {
    const response = await api.get<ApiResponse<Service[]>>("/api/services", {
      params,
    });
    return response.data;
  },

  // Get service by ID
  getServiceById: async (id: string): Promise<ApiResponse<Service>> => {
    const response = await api.get<ApiResponse<Service>>(`/api/services/${id}`);
    return response.data;
  },

  // Create new service (Provider only)
  createService: async (serviceData: {
    name: string;
    description: string;
    category: string;
    price: number;
  }): Promise<ApiResponse<Service>> => {
    const response = await api.post<ApiResponse<Service>>(
      "/api/services",
      serviceData
    );
    return response.data;
  },

  // Update service (Provider/Admin)
  updateService: async (
    id: string,
    updateData: Partial<Service>
  ): Promise<ApiResponse<Service>> => {
    const response = await api.put<ApiResponse<Service>>(
      `/api/services/${id}`,
      updateData
    );
    return response.data;
  },

  // Delete service (Provider/Admin)
  deleteService: async (id: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/api/services/${id}`);
    return response.data;
  },

  // Get services by provider
  getProviderServices: async (
    providerId?: string
  ): Promise<ApiResponse<Service[]>> => {
    const url = providerId
      ? `/api/services?provider=${providerId}`
      : "/api/services?provider=current";
    const response = await api.get<ApiResponse<Service[]>>(url);
    return response.data;
  },
};

// Categories API functions
export const categoriesAPI = {
  // Get all categories
  getCategories: async (): Promise<ApiResponse<any[]>> => {
    const response = await api.get<ApiResponse<any[]>>("/api/categories");
    return response.data;
  },
};

// Chat API functions
export const chatAPI = {
  // Get or create chat room for a booking
  getOrCreateChatRoom: async (bookingId: string): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>(
      `/api/chat/booking/${bookingId}`
    );
    return response.data;
  },

  // Get messages for a chat room
  getChatMessages: async (
    chatRoomId: string,
    page = 1,
    limit = 50
  ): Promise<ApiResponse<any[]>> => {
    const response = await api.get<ApiResponse<any[]>>(
      `/api/chat/${chatRoomId}/messages`,
      {
        params: { page, limit },
      }
    );
    return response.data;
  },

  // Send a message
  sendMessage: async (
    chatRoomId: string,
    messageData: any
  ): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>(
      `/api/chat/${chatRoomId}/messages`,
      messageData
    );
    return response.data;
  },

  // Send price offer
  sendPriceOffer: async (
    chatRoomId: string,
    offerData: any
  ): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>(
      `/api/chat/${chatRoomId}/price-offer`,
      offerData
    );
    return response.data;
  },

  // Respond to price offer
  respondToPriceOffer: async (
    chatRoomId: string,
    messageId: string,
    responseData: any
  ): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>(
      `/api/chat/${chatRoomId}/price-offer/${messageId}/respond`,
      responseData
    );
    return response.data;
  },

  // Upload file to chat
  uploadFile: async (
    chatRoomId: string,
    file: File,
    description: string
  ): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("description", description);

    const response = await api.post<ApiResponse<any>>(
      `/api/chat/${chatRoomId}/upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  // Send schedule modification
  sendScheduleModification: async (
    chatRoomId: string,
    scheduleData: any
  ): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>(
      `/api/chat/${chatRoomId}/schedule-modification`,
      scheduleData
    );
    return response.data;
  },

  // Get user's chat rooms
  getUserChatRooms: async (): Promise<ApiResponse<any[]>> => {
    const response = await api.get<ApiResponse<any[]>>("/api/chat/rooms");
    return response.data;
  },
};

// Proposals API functions
export const proposalsAPI = {
  // Create a new proposal
  createProposal: async (proposalData: any): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>(
      "/api/proposals",
      proposalData
    );
    return response.data;
  },

  // Get proposals for a booking
  getBookingProposals: async (
    bookingId: string
  ): Promise<ApiResponse<any[]>> => {
    const response = await api.get<ApiResponse<any[]>>(
      `/api/proposals/booking/${bookingId}`
    );
    return response.data;
  },

  // Respond to a proposal
  respondToProposal: async (
    proposalId: string,
    responseData: any
  ): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>(
      `/api/proposals/${proposalId}/respond`,
      responseData
    );
    return response.data;
  },

  // Get user proposals
  getUserProposals: async (
    type = "all",
    status?: string
  ): Promise<ApiResponse<any[]>> => {
    const response = await api.get<ApiResponse<any[]>>("/api/proposals", {
      params: { type, status },
    });
    return response.data;
  },

  // Get proposal by ID
  getProposalById: async (proposalId: string): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>(
      `/api/proposals/${proposalId}`
    );
    return response.data;
  },

  // Cancel proposal
  cancelProposal: async (proposalId: string): Promise<ApiResponse<any>> => {
    const response = await api.delete<ApiResponse<any>>(
      `/api/proposals/${proposalId}`
    );
    return response.data;
  },
};

// Admin API functions
export const adminAPI = {
  // Get all users
  getAllUsers: async (): Promise<ApiResponse<User[]>> => {
    const response = await api.get<ApiResponse<User[]>>("/api/admin/users");
    return response.data;
  },

  // Update user status
  updateUserStatus: async (
    userId: string,
    status: "active" | "inactive" | "suspended"
  ): Promise<ApiResponse<User>> => {
    const response = await api.put<ApiResponse<User>>(
      `/api/admin/users/${userId}/status`,
      { status }
    );
    return response.data;
  },

  // Delete user
  deleteUser: async (userId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/admin/users/${userId}`
    );
    return response.data;
  },

  // Verify provider
  verifyProvider: async (
    providerId: string,
    verified: boolean
  ): Promise<ApiResponse<any>> => {
    const response = await api.put<ApiResponse<any>>(
      `/api/admin/providers/${providerId}/verify`,
      { verified }
    );
    return response.data;
  },

  // Get system statistics
  getSystemStats: async (): Promise<{
    totalUsers: number;
    totalConsumers: number;
    totalProviders: number;
    verifiedProviders: number;
    totalIssues: number;
    openIssues: number;
    inProgressIssues: number;
    resolvedIssues: number;
    totalServices: number;
    activeServices: number;
    totalBookings: number;
    completedBookings: number;
    pendingBookings: number;
  }> => {
    const response = await api.get("/api/admin/stats");
    return response.data.data;
  },

  // Get all issues (admin view)
  getAllIssues: async (): Promise<ApiResponse<Issue[]>> => {
    const response = await api.get<ApiResponse<Issue[]>>("/api/admin/issues");
    return response.data;
  },

  // Delete issue
  deleteIssue: async (issueId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/admin/issues/${issueId}`
    );
    return response.data;
  },

  // Get all services (admin view)
  getAllServices: async (): Promise<ApiResponse<Service[]>> => {
    const response = await api.get<ApiResponse<Service[]>>(
      "/api/admin/services"
    );
    return response.data;
  },

  // Delete service
  deleteService: async (serviceId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/admin/services/${serviceId}`
    );
    return response.data;
  },

  // Get all bookings (admin view)
  getAllBookings: async (): Promise<ApiResponse<Booking[]>> => {
    const response = await api.get<ApiResponse<Booking[]>>(
      "/api/admin/bookings"
    );
    return response.data;
  },
};

// Notification API
export const notificationAPI = {
  // Get user notifications
  getUserNotifications: async (
    page = 1,
    limit = 20,
    filters?: {
      type?: string;
      isRead?: boolean;
      priority?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<ApiResponse<any[]> & { unreadCount: number; pagination: any }> => {
    const response = await api.get<
      ApiResponse<any[]> & { unreadCount: number; pagination: any }
    >("/api/notifications", { params: { page, limit, ...filters } });
    return response.data;
  },

  // Get unread notification count
  getUnreadCount: async (): Promise<ApiResponse<{ unreadCount: number }>> => {
    const response = await api.get<ApiResponse<{ unreadCount: number }>>(
      "/api/notifications/unread-count"
    );
    return response.data;
  },

  // Mark notifications as read
  markAsRead: async (notificationIds: string[]): Promise<ApiResponse<any>> => {
    const response = await api.patch<ApiResponse<any>>(
      "/api/notifications/read",
      { notificationIds }
    );
    return response.data;
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<ApiResponse<any>> => {
    const response = await api.patch<ApiResponse<any>>(
      "/api/notifications/read-all"
    );
    return response.data;
  },

  // Delete notification
  deleteNotification: async (
    notificationId: string
  ): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/notifications/${notificationId}`
    );
    return response.data;
  },

  // Create test notification (development only)
  createTestNotification: async (data: {
    type?: string;
    title?: string;
    message?: string;
    priority?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>(
      "/api/notifications/test",
      data
    );
    return response.data;
  },
};

export default api;
