"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useToast } from "../../contexts/ToastContext";
import { useSocket } from "../../contexts/SocketContext";
import { chatAPI } from "../../lib/api";
import Image from "next/image";
import {
  Send,
  Paperclip,
  DollarSign,
  Calendar,
  Clock,
  Image as ImageIcon,
  FileText,
  X,
  CheckCircle,
  XCircle,
  Loader2,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";

interface Message {
  _id: string;
  senderId: {
    _id: string;
    name: string;
    role: string;
  };
  messageType: string;
  content: {
    text?: string;
    priceOffer?: {
      amount: number;
      description: string;
      validUntil: string;
    };
    scheduleModification?: {
      proposedDate: string;
      proposedTime: string;
      reason: string;
    };
    attachments?: Array<{
      type: string;
      url: string;
      filename: string;
    }>;
  };
  createdAt: string;
  replyTo?: string;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  currentUserId: string;
  onBookingUpdate?: () => void;
}

export default function ChatModal({
  isOpen,
  onClose,
  bookingId,
  currentUserId,
  onBookingUpdate,
}: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatRoom, setChatRoom] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showPriceOffer, setShowPriceOffer] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [priceOffer, setPriceOffer] = useState({
    amount: "",
    description: "",
    validUntil: "",
  });
  const [scheduleModification, setScheduleModification] = useState({
    proposedDate: "",
    proposedTime: "",
    reason: "",
  });
  const [uploading, setUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();
  const { socket, isConnected, onlineUsers, typingUsers } = useSocket();

  const initializeChat = useCallback(async () => {
    try {
      setLoading(true);

      // Get or create chat room
      const chatRoomResponse = await chatAPI.getOrCreateChatRoom(bookingId);
      setChatRoom(chatRoomResponse.data);

      // Get messages
      const messagesResponse = await chatAPI.getChatMessages(
        chatRoomResponse.data._id
      );
      setMessages(messagesResponse.data);
    } catch (error: any) {
      console.error("Error initializing chat:", error);
      addToast({
        type: "error",
        message: "Failed to load chat",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, [bookingId, addToast]);

  useEffect(() => {
    if (isOpen && bookingId) {
      initializeChat();
    }
  }, [isOpen, bookingId, initializeChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time socket event handlers
  useEffect(() => {
    if (!socket || !chatRoom) return;

    // Join chat room for real-time updates
    socket.emit("join_chat_room", chatRoom._id);

    // Handle new messages
    socket.on("new_message", ({ message, chatRoomId }) => {
      if (chatRoomId === chatRoom._id) {
        setMessages((prev) => [...prev, message]);
      }
    });

    // Handle new price offers
    socket.on("new_price_offer", ({ message, offer, chatRoomId }) => {
      if (chatRoomId === chatRoom._id) {
        setMessages((prev) => [...prev, message]);
        addToast({
          type: "info",
          message: `New price offer: $${offer.amount}`,
          duration: 5000,
        });
      }
    });

    // Handle price offer responses
    socket.on("price_offer_response", ({ message, action, chatRoomId }) => {
      if (chatRoomId === chatRoom._id) {
        setMessages((prev) => [...prev, message]);
        addToast({
          type: action === "accept" ? "success" : "warning",
          message: `Price offer ${action}ed`,
          duration: 3000,
        });
        if (action === "accept" && onBookingUpdate) {
          onBookingUpdate();
        }
      }
    });

    // Handle typing indicators
    socket.on("user_typing", ({ userId, userName, chatRoomId }) => {
      if (chatRoomId === chatRoom._id && userId !== currentUserId) {
        // Typing indicator logic is handled by the typingUsers from context
      }
    });

    // Handle user joining/leaving chat
    socket.on("user_joined_chat", ({ userId, chatRoomId }) => {
      if (chatRoomId === chatRoom._id && userId !== currentUserId) {
        addToast({
          type: "info",
          message: "User joined the chat",
          duration: 2000,
        });
      }
    });

    socket.on("user_left_chat", ({ userId, chatRoomId }) => {
      if (chatRoomId === chatRoom._id && userId !== currentUserId) {
        addToast({
          type: "info",
          message: "User left the chat",
          duration: 2000,
        });
      }
    });

    // Cleanup function
    return () => {
      socket.emit("leave_chat_room", chatRoom._id);
      socket.off("new_message");
      socket.off("new_price_offer");
      socket.off("price_offer_response");
      socket.off("user_typing");
      socket.off("user_stopped_typing");
      socket.off("user_joined_chat");
      socket.off("user_left_chat");
    };
  }, [socket, chatRoom, currentUserId, addToast, onBookingUpdate]);

  // Handle typing indicators
  const handleTyping = () => {
    if (!socket || !chatRoom) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit("typing_start", {
        chatRoomId: chatRoom._id,
        userName: "You", // This should be the current user's name
      });
    }

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Set new timeout to stop typing
    const timeout = setTimeout(() => {
      setIsTyping(false);
      socket.emit("typing_stop", { chatRoomId: chatRoom._id });
    }, 2000);

    setTypingTimeout(timeout);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatRoom) return;

    try {
      setSending(true);

      // Stop typing indicator
      if (isTyping && socket) {
        setIsTyping(false);
        socket.emit("typing_stop", { chatRoomId: chatRoom._id });
      }

      const response = await chatAPI.sendMessage(chatRoom._id, {
        messageType: "text",
        content: { text: newMessage.trim() },
      });

      // Note: Real-time message will be received via socket, so we don't add it here
      setNewMessage("");
    } catch (error: any) {
      console.error("Error sending message:", error);
      addToast({
        type: "error",
        message: "Failed to send message",
        duration: 3000,
      });
    } finally {
      setSending(false);
    }
  };

  const sendPriceOffer = async () => {
    if (!priceOffer.amount || !chatRoom) return;

    try {
      setSending(true);
      const response = await chatAPI.sendPriceOffer(chatRoom._id, {
        amount: parseFloat(priceOffer.amount),
        description: priceOffer.description,
        validUntil:
          priceOffer.validUntil ||
          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      setMessages((prev) => [...prev, response.data]);
      setPriceOffer({ amount: "", description: "", validUntil: "" });
      setShowPriceOffer(false);
      addToast({
        type: "success",
        message: "Price offer sent!",
        duration: 3000,
      });
    } catch (error: any) {
      console.error("Error sending price offer:", error);
      addToast({
        type: "error",
        message: "Failed to send price offer",
        duration: 3000,
      });
    } finally {
      setSending(false);
    }
  };

  const respondToPriceOffer = async (
    messageId: string,
    action: "accept" | "reject"
  ) => {
    if (!chatRoom) return;

    try {
      const response = await chatAPI.respondToPriceOffer(
        chatRoom._id,
        messageId,
        {
          action,
          message:
            action === "accept"
              ? "Price offer accepted!"
              : "Price offer rejected",
        }
      );

      setMessages((prev) => [...prev, response.data]);
      addToast({
        type: "success",
        message: `Price offer ${action}ed!`,
        duration: 3000,
      });

      // Call booking update callback if price offer was accepted
      if (action === "accept" && onBookingUpdate) {
        onBookingUpdate();
      }
    } catch (error: any) {
      console.error("Error responding to price offer:", error);
      addToast({
        type: "error",
        message: `Failed to ${action} price offer`,
        duration: 3000,
      });
    }
  };

  const sendScheduleModification = async () => {
    if (!scheduleModification.proposedDate || !chatRoom) return;

    try {
      setSending(true);
      const response = await chatAPI.sendScheduleModification(
        chatRoom._id,
        scheduleModification
      );

      setMessages((prev) => [...prev, response.data]);
      setScheduleModification({
        proposedDate: "",
        proposedTime: "",
        reason: "",
      });
      setShowScheduleModal(false);
      addToast({
        type: "success",
        message: "Schedule modification request sent!",
        duration: 3000,
      });
    } catch (error: any) {
      console.error("Error sending schedule modification:", error);
      addToast({
        type: "error",
        message: "Failed to send schedule modification",
        duration: 3000,
      });
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !chatRoom) return;

    try {
      setUploading(true);
      const response = await chatAPI.uploadFile(chatRoom._id, file, "");
      setMessages((prev) => [...prev, response.data]);
      addToast({
        type: "success",
        message: "File uploaded successfully!",
        duration: 3000,
      });
    } catch (error: any) {
      console.error("Error uploading file:", error);
      addToast({
        type: "error",
        message: "Failed to upload file",
        duration: 3000,
      });
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isCurrentUser = (senderId: string) => senderId === currentUserId;

  const renderMessage = (message: Message) => {
    const isOwn = isCurrentUser(message.senderId._id);

    switch (message.messageType) {
      case "text":
        return (
          <div
            className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-4`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                isOwn
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
              }`}
            >
              <p className="text-sm">{message.content.text}</p>
              <p className="text-xs opacity-75 mt-1">
                {formatDate(message.createdAt)}
              </p>
            </div>
          </div>
        );

      case "price_offer":
        return (
          <div
            className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-4`}
          >
            <Card className="max-w-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Price Offer
                </CardTitle>
              </CardHeader>
              <CardContent className="">
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-green-600">
                    ${message.content.priceOffer?.amount}
                  </p>
                  {message.content.priceOffer?.description && (
                    <p className="text-sm text-gray-600">
                      {message.content.priceOffer.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Valid until:{" "}
                    {formatDate(message.content.priceOffer?.validUntil || "")}
                  </p>
                  <p className="text-xs text-gray-500">
                    From: {message.senderId.name} •{" "}
                    {formatDate(message.createdAt)}
                  </p>
                  {!isOwn && (
                    <div className="flex space-x-2 mt-3">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() =>
                          respondToPriceOffer(message._id, "accept")
                        }
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          respondToPriceOffer(message._id, "reject")
                        }
                        className="border-red-600 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "schedule_modification":
        return (
          <div
            className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-4`}
          >
            <Card className="max-w-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Change Request
                </CardTitle>
              </CardHeader>
              <CardContent className="">
                <div className="space-y-2">
                  <p className="text-sm">
                    <strong>New Date:</strong>{" "}
                    {formatDate(
                      message.content.scheduleModification?.proposedDate || ""
                    )}
                  </p>
                  {message.content.scheduleModification?.proposedTime && (
                    <p className="text-sm">
                      <strong>Time:</strong>{" "}
                      {message.content.scheduleModification.proposedTime}
                    </p>
                  )}
                  {message.content.scheduleModification?.reason && (
                    <p className="text-sm">
                      <strong>Reason:</strong>{" "}
                      {message.content.scheduleModification.reason}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    From: {message.senderId.name} •{" "}
                    {formatDate(message.createdAt)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "image":
      case "document":
        return (
          <div
            className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-4`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                isOwn
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
              }`}
            >
              {message.content.attachments?.map((attachment, index) => (
                <div key={index} className="space-y-2">
                  {attachment.type === "image" ? (
                    <div>
                      <Image
                        src={`${process.env.NEXT_PUBLIC_API_URL}${attachment.url}`}
                        alt={attachment.filename}
                        width={300}
                        height={200}
                        className="max-w-full h-auto rounded object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5" />
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_URL}${attachment.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        {attachment.filename}
                      </a>
                    </div>
                  )}
                </div>
              ))}
              {message.content.text && (
                <p className="text-sm mt-2">{message.content.text}</p>
              )}
              <p className="text-xs opacity-75 mt-1">
                {formatDate(message.createdAt)}
              </p>
            </div>
          </div>
        );

      case "system":
        return (
          <div className="flex justify-center mb-4">
            <div className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {message.content.text}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl h-[80vh]">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading chat...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Chat & Negotiation</DialogTitle>
            <div className="flex items-center space-x-2">
              {/* Connection Status */}
              <div className="flex items-center space-x-1">
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <span className="text-xs text-gray-500">
                  {isConnected ? "Connected" : "Offline"}
                </span>
              </div>

              {/* Online Users Indicator */}
              {chatRoom && (
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-gray-500">
                    {chatRoom.participants?.filter((p: any) =>
                      onlineUsers.has(p._id || p)
                    ).length || 0}{" "}
                    online
                  </span>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message._id}>{renderMessage(message)}</div>
          ))}

          {/* Typing Indicators */}
          {chatRoom &&
            Array.from(typingUsers.entries())
              .filter(([key, _]) => key.startsWith(chatRoom._id))
              .map(([key, user]) => (
                <div key={key} className="text-gray-500 text-sm italic">
                  {user.userName} is typing...
                </div>
              ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Action Buttons */}
        <div className="border-t p-2 dark:bg-gray-8000">
          <div className="flex space-x-2 mb-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPriceOffer(true)}
              className="flex items-center border-2 border-blue-500"
            >
              <DollarSign className="h-4 w-4 mr-1" />
              Price Offer
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowScheduleModal(true)}
              className="flex items-center border-2 border-green-500"
            >
              <Calendar className="h-4 w-4 mr-1" />
              Reschedule
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center border-2 border-orange-500"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4 mr-1" />
              )}
              Attach
            </Button>
          </div>

          {/* Message Input */}
          <div className="flex space-x-2">
            <Input
              type="text"
              className="flex-1"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              placeholder="Type your message..."
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              disabled={sending}
            />
            <Button
              variant="default"
              size="default"
              className=""
              onClick={sendMessage}
              disabled={sending || !newMessage.trim()}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          hidden
          onChange={handleFileUpload}
          accept="image/*,.pdf,.doc,.docx,.txt"
        />

        {/* Price Offer Modal */}
        {showPriceOffer && (
          <Dialog open={showPriceOffer} onOpenChange={setShowPriceOffer}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Price Offer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Amount ($)
                  </label>
                  <Input
                    type="number"
                    className=""
                    value={priceOffer.amount}
                    onChange={(e) =>
                      setPriceOffer({ ...priceOffer, amount: e.target.value })
                    }
                    placeholder="Enter amount"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Description
                  </label>
                  <Textarea
                    value={priceOffer.description}
                    onChange={(e) =>
                      setPriceOffer({
                        ...priceOffer,
                        description: e.target.value,
                      })
                    }
                    placeholder="Explain your offer..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Valid Until
                  </label>
                  <Input
                    type="datetime-local"
                    className=""
                    value={priceOffer.validUntil}
                    onChange={(e) =>
                      setPriceOffer({
                        ...priceOffer,
                        validUntil: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="default"
                    size="default"
                    className=""
                    onClick={sendPriceOffer}
                    disabled={!priceOffer.amount}
                  >
                    Send Offer
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    className=""
                    onClick={() => setShowPriceOffer(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Schedule Modification Modal */}
        {showScheduleModal && (
          <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Schedule Change</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    New Date
                  </label>
                  <Input
                    type="date"
                    className=""
                    value={scheduleModification.proposedDate}
                    onChange={(e) =>
                      setScheduleModification({
                        ...scheduleModification,
                        proposedDate: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Time</label>
                  <Input
                    type="time"
                    className=""
                    value={scheduleModification.proposedTime}
                    onChange={(e) =>
                      setScheduleModification({
                        ...scheduleModification,
                        proposedTime: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Reason
                  </label>
                  <Textarea
                    value={scheduleModification.reason}
                    onChange={(e) =>
                      setScheduleModification({
                        ...scheduleModification,
                        reason: e.target.value,
                      })
                    }
                    placeholder="Why do you need to reschedule?"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="default"
                    size="default"
                    className=""
                    onClick={sendScheduleModification}
                    disabled={!scheduleModification.proposedDate}
                  >
                    Send Request
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    className=""
                    onClick={() => setShowScheduleModal(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
