import "@typespec/http";
import "@typespec/openapi";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

@service(#{ title: "Calendar Booking API" })
@route("api")
namespace BookingApi;

/** Greeting returned by the service. */
model Message {
  /** Human-readable greeting text. */
  message: string;
}

@route("message")
@get op getMessage(): Message;
